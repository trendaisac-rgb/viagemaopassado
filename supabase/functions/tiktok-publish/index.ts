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
const TT = "https://open.tiktokapis.com";

async function loadVideo(admin: any, videoUrl: string): Promise<Uint8Array> {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { episode_id, title } = await req.json();
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single();
    if (!ep) return json({ error: "episódio não encontrado" }, 404);
    if (!ep.video_url) return json({ error: "episódio sem vídeo renderizado (video_url vazio)" }, 400);

    const { data: tok } = await admin.from("social_tokens").select("*").eq("user_id", user.id).eq("platform", "tiktok").single();
    if (!tok) return json({ error: "TikTok não conectado. Vá em Conexões." }, 400);
    const access = tok.access_token as string;

    const bytes = await loadVideo(admin, ep.video_url);
    const total = bytes.length;

    // privacidade permitida (apps sem auditoria => só SELF_ONLY)
    let privacy = "SELF_ONLY";
    try {
      const ciRes = await fetch(TT + "/v2/post/publish/creator_info/query/", { method: "POST", headers: { Authorization: "Bearer " + access, "Content-Type": "application/json; charset=UTF-8" } });
      const ci = await ciRes.json();
      const opts: string[] = ci.data?.privacy_level_options ?? [];
      if (opts.includes("PUBLIC_TO_EVERYONE")) privacy = "PUBLIC_TO_EVERYONE";
      else if (opts.length) privacy = opts[0];
    } catch (_) {}

    const ttTitle = String(title ?? ep.caption ?? ep.title ?? "").slice(0, 150);
    const initBody = {
      post_info: { title: ttTitle, privacy_level: privacy, disable_comment: false, disable_duet: false, disable_stitch: false },
      source_info: { source: "FILE_UPLOAD", video_size: total, chunk_size: total, total_chunk_count: 1 },
    };
    const initRes = await fetch(TT + "/v2/post/publish/video/init/", { method: "POST", headers: { Authorization: "Bearer " + access, "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(initBody) });
    const initJson = await initRes.json();
    const publishId = initJson.data?.publish_id;
    const uploadUrl = initJson.data?.upload_url;
    if (!initRes.ok || !uploadUrl) return json({ error: "INIT TikTok: " + JSON.stringify(initJson).slice(0, 250) }, 502);

    const upRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Range": "bytes 0-" + (total - 1) + "/" + total }, body: bytes });
    if (!upRes.ok) return json({ error: "upload do vídeo pro TikTok falhou (" + upRes.status + ")" }, 502);

    const { data: existing } = await admin.from("scheduled_posts").select("id").eq("episode_id", episode_id).eq("network", "tiktok").maybeSingle();
    if (existing) await admin.from("scheduled_posts").update({ status: "published", external_id: publishId, scheduled_at: new Date().toISOString() }).eq("id", existing.id);
    else await admin.from("scheduled_posts").insert({ user_id: user.id, episode_id, network: "tiktok", scheduled_at: new Date().toISOString(), status: "published", external_id: publishId });

    return json({ id: publishId, privacy, status: "uploaded" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
