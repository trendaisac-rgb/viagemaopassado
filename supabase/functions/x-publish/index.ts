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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function refreshX(admin: any, tok: any): Promise<string> {
  const exp = tok.expires_at ? Date.parse(tok.expires_at) : 0;
  if (tok.access_token && exp - Date.now() > 120000) return tok.access_token;
  if (!tok.refresh_token) {
    if (tok.access_token) return tok.access_token;
    throw new Error("Sem refresh_token; reconecte o X em Conexões.");
  }
  const id = Deno.env.get("X_CLIENT_ID")!, sec = Deno.env.get("X_CLIENT_SECRET")!;
  const basic = btoa(id + ":" + sec);
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok.refresh_token, client_id: id });
  const r = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basic }, body });
  const t = await r.json();
  if (!r.ok) throw new Error(t.error_description || "falha ao renovar token do X");
  const access = t.access_token as string;
  const newRefresh = t.refresh_token ?? tok.refresh_token;
  const expires_at = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from("social_tokens").update({ access_token: access, refresh_token: newRefresh, expires_at, updated_at: new Date().toISOString() }).eq("user_id", tok.user_id).eq("platform", "x");
  return access;
}

async function loadVideo(admin: any, videoUrl: string | null): Promise<Uint8Array | null> {
  if (!videoUrl) return null;
  if (videoUrl.startsWith("http")) {
    const r = await fetch(videoUrl);
    if (!r.ok) throw new Error("falha ao baixar o vídeo (" + r.status + ")");
    return new Uint8Array(await r.arrayBuffer());
  }
  const path = videoUrl.indexOf("episodes/") === 0 ? videoUrl.slice(9) : videoUrl;
  const { data, error } = await admin.storage.from("episodes").download(path);
  if (error || !data) throw new Error("vídeo não encontrado no storage");
  return new Uint8Array(await data.arrayBuffer());
}

// Upload de vídeo em 3 etapas (X API v2 /2/media/upload, OAuth2 + media.write)
async function xUploadVideo(access: string, bytes: Uint8Array): Promise<string> {
  const baseUrl = "https://api.x.com/2/media/upload";
  const auth = { Authorization: "Bearer " + access };

  const initRes = await fetch(baseUrl + "/initialize", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "video/mp4", total_bytes: bytes.length, media_category: "tweet_video" }),
  });
  const initJson = await initRes.json();
  const mediaId = initJson?.data?.id ?? initJson?.media_id_string;
  if (!initRes.ok || !mediaId) throw new Error("INIT: " + JSON.stringify(initJson).slice(0, 200));

  const CHUNK = 4 * 1024 * 1024;
  let idx = 0;
  for (let off = 0; off < bytes.length; off += CHUNK) {
    const chunk = bytes.slice(off, off + CHUNK);
    const fd = new FormData();
    fd.append("segment_index", String(idx));
    fd.append("media", new Blob([chunk]));
    const apRes = await fetch(baseUrl + "/" + mediaId + "/append", { method: "POST", headers: auth, body: fd });
    if (!apRes.ok) throw new Error("APPEND seg " + idx + ": " + (await apRes.text()).slice(0, 200));
    idx++;
  }

  const finRes = await fetch(baseUrl + "/" + mediaId + "/finalize", { method: "POST", headers: auth });
  const finJson = await finRes.json();
  if (!finRes.ok) throw new Error("FINALIZE: " + JSON.stringify(finJson).slice(0, 200));

  let info = finJson?.data?.processing_info ?? finJson?.processing_info;
  let tries = 0;
  while (info && info.state && info.state !== "succeeded" && info.state !== "failed" && tries < 20) {
    await sleep((info.check_after_secs ?? 3) * 1000);
    const stRes = await fetch(baseUrl + "?command=STATUS&media_id=" + mediaId, { method: "GET", headers: auth });
    const stJson = await stRes.json();
    info = stJson?.data?.processing_info ?? stJson?.processing_info;
    tries++;
  }
  if (info && info.state === "failed") throw new Error("processamento do vídeo falhou: " + JSON.stringify(info).slice(0, 200));
  return String(mediaId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { episode_id, text } = await req.json();
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);
    if (!Deno.env.get("X_CLIENT_ID")) return json({ error: "Configure X_CLIENT_ID/SECRET nos secrets do Supabase." }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single();
    if (!ep) return json({ error: "episódio não encontrado" }, 404);

    const { data: tok } = await admin.from("social_tokens").select("*").eq("user_id", user.id).eq("platform", "x").single();
    if (!tok) return json({ error: "X não conectado. Vá em Conexões." }, 400);

    const access = await refreshX(admin, tok);

    const base = (text ?? ep.caption ?? ep.title ?? "").toString();
    const tags = Array.isArray(ep.hashtags) ? ep.hashtags.join(" ") : "";
    let content = (tags ? base + " " + tags : base).trim();
    if (content.length > 280) content = content.slice(0, 279) + "…";

    let media_ids: string[] = [];
    try {
      const bytes = await loadVideo(admin, ep.video_url);
      if (bytes) { const mid = await xUploadVideo(access, bytes); media_ids = [mid]; }
    } catch (e) {
      return json({ error: "upload de vídeo pra X falhou: " + (e as Error).message }, 502);
    }

    const tweetBody: any = { text: content };
    if (media_ids.length) tweetBody.media = { media_ids };

    const r = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
      body: JSON.stringify(tweetBody),
    });
    const t = await r.json();
    if (!r.ok || !t.data?.id) return json({ error: "falha ao postar no X: " + JSON.stringify(t).slice(0, 300) }, 502);
    const id = t.data.id as string;

    const { data: existing } = await admin.from("scheduled_posts").select("id").eq("episode_id", episode_id).eq("network", "x").maybeSingle();
    if (existing) await admin.from("scheduled_posts").update({ status: "published", external_id: id, scheduled_at: new Date().toISOString() }).eq("id", existing.id);
    else await admin.from("scheduled_posts").insert({ user_id: user.id, episode_id, network: "x", scheduled_at: new Date().toISOString(), status: "published", external_id: id });

    return json({ url: "https://twitter.com/i/web/status/" + id, id, with_video: media_ids.length > 0 });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
