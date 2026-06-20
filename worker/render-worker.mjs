import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) { console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja .env.example)."); process.exit(1); }
const admin = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const POLL_MS = 8000;

// Trilha procedural (pad grave + shimmer + pulso) — gera um WAV se nao existir, sem assets binarios no repo.
function ensureTrilha() {
  const dir = path.join(__dirname, "remotion", "public");
  const out = path.join(dir, "trilha.wav");
  try { if (fsSync.existsSync(out)) return; } catch (_) {}
  fsSync.mkdirSync(dir, { recursive: true });
  const SR = 22050, DUR = 180, N = SR * DUR;
  const notes = [55, 82.41, 110, 138.59]; // La menor/maior grave
  const data = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 8); // respiracao lenta
    let v = 0;
    for (const f of notes) v += Math.sin(2 * Math.PI * f * t);
    v = (v / notes.length) * (0.35 + 0.25 * lfo);
    // pulso grave a cada 2.4s
    const ph = t % 2.4;
    if (ph < 0.5) v += Math.sin(2 * Math.PI * 60 * t) * 0.25 * Math.exp(-ph * 6);
    // shimmer agudo esparso
    v += Math.sin(2 * Math.PI * 2400 * t) * 0.015 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 5));
    let s16 = Math.max(-1, Math.min(1, v)) * 32767;
    data.writeInt16LE(s16 | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  fsSync.writeFileSync(out, Buffer.concat([header, data]));
  console.log("trilha.wav gerada (" + DUR + "s).");
}

const PUBFN = { youtube: "youtube-publish", x: "x-publish" };
async function publishDue() {
  const nowIso = new Date().toISOString();
  const { data: due } = await admin.from("scheduled_posts").select("*").eq("status", "scheduled").lte("scheduled_at", nowIso).limit(10);
  for (const post of (due || [])) {
    const fn = PUBFN[post.network];
    if (!fn) continue;
    await admin.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);
    try {
      const res = await fetch(SUPABASE_URL + "/functions/v1/" + fn, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + KEY, "apikey": KEY },
        body: JSON.stringify({ episode_id: post.episode_id, user_id: post.user_id }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && !j.error) {
        await admin.from("scheduled_posts").update({ status: "published", external_id: j.id || null }).eq("id", post.id);
        console.log("publicado agendado:", post.network, j.url || j.id || "");
      } else {
        await admin.from("scheduled_posts").update({ status: "failed", error: String(j.error || res.status).slice(0, 400) }).eq("id", post.id);
        console.error("agendado falhou:", post.network, j.error);
      }
    } catch (e) {
      await admin.from("scheduled_posts").update({ status: "failed", error: String(e.message).slice(0, 400) }).eq("id", post.id);
    }
  }
}

let serveUrl = null;
async function getBundle() {
  if (serveUrl) return serveUrl;
  ensureTrilha();
  console.log("Empacotando Remotion (primeira vez demora um pouco)…");
  serveUrl = await bundle({ entryPoint: path.join(__dirname, "remotion", "index.ts") });
  return serveUrl;
}

async function claimJob() {
  const { data: jobs } = await admin.from("render_jobs").select("*").eq("status", "queued").order("created_at").limit(1);
  const job = jobs && jobs[0];
  if (!job) return null;
  const { data: upd } = await admin.from("render_jobs").update({ status: "rendering", claimed_at: new Date().toISOString() }).eq("id", job.id).eq("status", "queued").select();
  return upd && upd.length ? upd[0] : null;
}

async function callFn(fn, body) {
  const res = await fetch(SUPABASE_URL + "/functions/v1/" + fn, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + KEY, "apikey": KEY },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(fn + ": " + (j.error || res.status));
  return j;
}

async function processJob(job) {
  let { data: ep } = await admin.from("episodes").select("*").eq("id", job.episode_id).single();
  if (!ep) throw new Error("episódio não encontrado");
  if (!ep.script) throw new Error("episódio sem roteiro — gere no Estúdio");

  // FULL AUTO: garante narração + imagens antes de renderizar
  if (!ep.narration_url) {
    console.log("→ narração (Victor Power)…");
    await admin.from("episodes").update({ status: "generating", progress_step: "narração", progress_pct: 50 }).eq("id", ep.id);
    await callFn("generate-narration", { episode_id: ep.id, user_id: ep.user_id });
    ({ data: ep } = await admin.from("episodes").select("*").eq("id", job.episode_id).single());
  }
  const sb = Array.isArray(ep.storyboard) ? ep.storyboard : [];
  const needsImg = sb.some((b) => b && (b.visual === "imagem" || b.visual === "video") && !b.image);
  if (needsImg) {
    console.log("→ imagens (IA)…");
    await admin.from("episodes").update({ status: "generating", progress_step: "imagens", progress_pct: 70 }).eq("id", ep.id);
    try { await callFn("generate-assets", { episode_id: ep.id, user_id: ep.user_id }); } catch (e) { console.warn("assets:", e.message); }
    ({ data: ep } = await admin.from("episodes").select("*").eq("id", job.episode_id).single());
  }
  if (!ep.narration_url) throw new Error("narração indisponível — configure a chave ElevenLabs em Conexões");
  await admin.from("episodes").update({ status: "generating", progress_step: "render", progress_pct: 85 }).eq("id", ep.id);

  const { data: signed } = await admin.storage.from("episodes").createSignedUrl(ep.narration_url, 3600);
  const narrationUrl = signed && signed.signedUrl;
  if (!narrationUrl) throw new Error("não consegui assinar a narração");

  const url = await getBundle();
  const inputProps = { script: ep.script, title: ep.title || "Viagem ao Passado", narrationUrl, storyboard: ep.storyboard || null, cues: ep.cues || null, hasTrilha: true };
  if (Array.isArray(inputProps.storyboard)) {
    for (const b of inputProps.storyboard) {
      if (b && b.image) { try { const sg = await admin.storage.from("episodes").createSignedUrl(b.image, 3600); if (sg.data && sg.data.signedUrl) b.imageUrl = sg.data.signedUrl; } catch (_) {} }
    }
  }
  const composition = await selectComposition({ serveUrl: url, id: "Episode", inputProps });
  const out = path.join(os.tmpdir(), ep.id + ".mp4");
  console.log("Renderizando:", ep.title);
  await renderMedia({ serveUrl: url, composition, codec: "h264", outputLocation: out, inputProps, concurrency: 2 });

  const bytes = await fs.readFile(out);
  const objectPath = ep.user_id + "/" + ep.id + ".mp4";
  const { error: upErr } = await admin.storage.from("episodes").upload(objectPath, bytes, { contentType: "video/mp4", upsert: true });
  if (upErr) throw new Error("upload falhou: " + upErr.message);
  await admin.from("episodes").update({ video_url: objectPath, status: "ready", progress_pct: 100, progress_step: "pronto" }).eq("id", ep.id);
  await admin.from("render_jobs").update({ status: "done" }).eq("id", job.id);
  await fs.unlink(out).catch(() => {});
  console.log("✓ pronto:", objectPath);
}

async function loop() {
  console.log("VaP render worker no ar. Aguardando jobs…");
  for (;;) {
    try {
      await publishDue();
      const job = await claimJob();
      if (job) {
        try { await processJob(job); }
        catch (e) {
          console.error("job falhou:", e.message);
          await admin.from("render_jobs").update({ status: "failed", error: String(e.message).slice(0, 500) }).eq("id", job.id);
          await admin.from("episodes").update({ status: "failed" }).eq("id", job.episode_id);
        }
      } else {
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    } catch (e) { console.error("loop:", e.message); await new Promise((r) => setTimeout(r, POLL_MS)); }
  }
}
loop();
