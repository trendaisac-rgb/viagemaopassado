import { createClient } from "@supabase/supabase-js";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) { console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja .env.example)."); process.exit(1); }
const admin = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const POLL_MS = 8000;

let serveUrl = null;
async function getBundle() {
  if (serveUrl) return serveUrl;
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

async function processJob(job) {
  const { data: ep } = await admin.from("episodes").select("*").eq("id", job.episode_id).single();
  if (!ep) throw new Error("episódio não encontrado");
  if (!ep.script) throw new Error("episódio sem roteiro — gere no Estúdio");
  if (!ep.narration_url) throw new Error("episódio sem narração — gere a narração no portal");
  const { data: signed } = await admin.storage.from("episodes").createSignedUrl(ep.narration_url, 3600);
  const narrationUrl = signed && signed.signedUrl;
  if (!narrationUrl) throw new Error("não consegui assinar a narração");

  const url = await getBundle();
  const inputProps = { script: ep.script, title: ep.title || "Viagem ao Passado", narrationUrl };
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
