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

async function refreshYouTube(admin: any, tok: any): Promise<string> {
  const exp = tok.expires_at ? Date.parse(tok.expires_at) : 0;
  if (tok.access_token && exp - Date.now() > 120000) return tok.access_token;
  if (!tok.refresh_token) {
    if (tok.access_token) return tok.access_token;
    throw new Error("Sem refresh_token; reconecte o YouTube em Conexões.");
  }
  const id = Deno.env.get("YOUTUBE_CLIENT_ID")!, sec = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
  const body = new URLSearchParams({ client_id: id, client_secret: sec, refresh_token: tok.refresh_token, grant_type: "refresh_token" });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const t = await r.json();
  if (!r.ok) throw new Error(t.error_description || "falha ao renovar token do YouTube");
  const access = t.access_token as string;
  const expires_at = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from("social_tokens").update({ access_token: access, expires_at, updated_at: new Date().toISOString() }).eq("user_id", tok.user_id).eq("platform", "youtube");
  return access;
}

async function loadVideoBytes(admin: any, videoUrl: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(videoUrl)) {
    const r = await fetch(videoUrl);
    if (!r.ok) throw new Error(`falha ao baixar o vídeo (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const path = videoUrl.replace(/^episodes\//, "");
  const { data, error } = await admin.storage.from("episodes").download(path);
  if (error || !data) throw new Error("vídeo não encontrado no storage (episodes/" + path + ")");
  return new Uint8Array(await data.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { episode_id, privacy } = await req.json();
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);
    if (!Deno.env.get("YOUTUBE_CLIENT_ID")) return json({ error: "Configure YOUTUBE_CLIENT_ID/SECRET nos secrets do Supabase." }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single();
    if (!ep) return json({ error: "episódio não encontrado" }, 404);
    if (!ep.video_url) return json({ error: "episódio sem vídeo renderizado (video_url vazio)" }, 400);

    const { data: tok } = await admin.from("social_tokens").select("*").eq("user_id", user.id).eq("platform", "youtube").single();
    if (!tok) return json({ error: "YouTube não conectado. Vá em Conexões." }, 400);

    const access = await refreshYouTube(admin, tok);
    const bytes = await loadVideoBytes(admin, ep.video_url);

    const title = String(ep.title ?? "Viagem ao Passado").slice(0, 100);
    const tags: string[] = Array.isArray(ep.hashtags) ? ep.hashtags.map((h: string) => h.replace(/^#/, "")) : [];
    const desc = `${ep.caption ?? ""}\n\n${(ep.hashtags ?? []).join(" ")}\n#Shorts`.slice(0, 4900);
    const privacyStatus = (privacy === "private" || privacy === "unlisted") ? privacy : "public";

    const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/*", "X-Upload-Content-Length": String(bytes.length) },
      body: JSON.stringify({ snippet: { title, description: desc, tags, categoryId: "27", defaultLanguage: "pt", defaultAudioLanguage: "pt" }, status: { privacyStatus, selfDeclaredMadeForKids: false } }),
    });
    if (!init.ok) { const e = await init.text(); return json({ error: "falha ao iniciar upload: " + e.slice(0, 300) }, 502); }
    const location = init.headers.get("location");
    if (!location) return json({ error: "YouTube não retornou URL de upload" }, 502);

    const up = await fetch(location, { method: "PUT", headers: { "Content-Type": "video/*" }, body: bytes });
    const v = await up.json();
    if (!up.ok || !v.id) return json({ error: "falha no upload: " + JSON.stringify(v).slice(0, 300) }, 502);
    const videoId = v.id as string;

    await admin.from("episodes").update({ status: "published" }).eq("id", episode_id);
    const { data: existing } = await admin.from("scheduled_posts").select("id").eq("episode_id", episode_id).eq("network", "youtube").maybeSingle();
    if (existing) await admin.from("scheduled_posts").update({ status: "published", external_id: videoId, scheduled_at: new Date().toISOString() }).eq("id", existing.id);
    else await admin.from("scheduled_posts").insert({ user_id: user.id, episode_id, network: "youtube", scheduled_at: new Date().toISOString(), status: "published", external_id: videoId });

    return json({ url: `https://youtu.be/${videoId}`, id: videoId, privacy: privacyStatus });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
