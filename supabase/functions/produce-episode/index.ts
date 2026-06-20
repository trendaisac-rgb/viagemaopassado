import { createClient } from "jsr:@supabase/supabase-js@2";

const cors: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function callAI(kind: string, input: any) {
  const r = await fetch(SUPA_URL + "/functions/v1/ai-generate", {
    method: "POST",
    headers: { Authorization: "Bearer " + SERVICE, apikey: SERVICE, "Content-Type": "application/json" },
    body: JSON.stringify({ kind, input }),
  });
  if (!r.ok) throw new Error("ai-generate(" + kind + "): " + (await r.text()).slice(0, 200));
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authz = req.headers.get("Authorization") ?? "";
    const isService = authz === "Bearer " + SERVICE;
    const body = await req.json().catch(() => ({}));
    const theme = (body.theme ?? "").toString().trim();
    const angle = (body.angle ?? "").toString().trim();
    const durationS = Math.min(Math.max(Number(body.duration_s ?? 60), 30), 120);
    let episodeId = body.episode_id as string | undefined;

    let uid = "";
    if (isService) { uid = body.user_id; }
    else {
      const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: authz } } });
      const gu = await userClient.auth.getUser();
      if (!gu.data.user) return json({ error: "nao autenticado" }, 401);
      uid = gu.data.user.id;
    }
    if (!uid) return json({ error: "user_id faltando" }, 400);
    if (!episodeId && !theme) return json({ error: "informe um tema" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);

    // 1) cria ou carrega o episodio
    let ep: any;
    if (episodeId) {
      const { data } = await admin.from("episodes").select("*").eq("id", episodeId).eq("user_id", uid).single();
      if (!data) return json({ error: "episodio nao encontrado" }, 404);
      ep = data;
    } else {
      const { data, error } = await admin.from("episodes").insert({
        user_id: uid, title: theme.slice(0, 120), topic: theme, angle: angle || null,
        status: "generating", aspect: "9:16", duration_s: durationS, voice: "victor",
        progress_step: "roteiro", progress_pct: 10,
      }).select().single();
      if (error || !data) return json({ error: "falha ao criar episodio: " + (error?.message ?? "") }, 500);
      ep = data;
    }
    episodeId = ep.id;
    const topic = ep.topic ?? theme;
    const ang = ep.angle ?? angle;

    // 2) roteiro + storyboard (fiel a skill) e legenda — sua chave OpenAI
    const scriptRes = await callAI("script", { topic, angle: ang, duration_s: ep.duration_s ?? durationS });
    let captionRes: any = {};
    try { captionRes = await callAI("caption", { topic, angle: ang, script: scriptRes.script ?? "" }); } catch (_) {}

    await admin.from("episodes").update({
      script: scriptRes.script ?? null,
      hook: scriptRes.hook ?? null,
      fact_checks: scriptRes.fact_checks ?? null,
      storyboard: scriptRes.storyboard ?? null,
      caption: captionRes.caption ?? null,
      hashtags: Array.isArray(captionRes.hashtags) ? captionRes.hashtags : null,
      status: "generating",
      progress_step: "midia",
      progress_pct: 35,
      updated_at: new Date().toISOString(),
    }).eq("id", episodeId);

    // 3) enfileira o render — o worker preenche narracao(timestamps)+imagens+video+mux
    const { data: existing } = await admin.from("render_jobs").select("id").eq("episode_id", episodeId).in("status", ["queued", "rendering"]).maybeSingle();
    if (!existing) await admin.from("render_jobs").insert({ user_id: uid, episode_id: episodeId, status: "queued" });

    return json({ ok: true, episode_id: episodeId, storyboard_beats: Array.isArray(scriptRes.storyboard) ? scriptRes.storyboard.length : 0 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
