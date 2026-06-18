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
const GRAPH = "https://graph.instagram.com";

async function signedVideoUrl(admin: any, videoUrl: string): Promise<string> {
  if (videoUrl.startsWith("http")) return videoUrl;
  const path = videoUrl.indexOf("episodes/") === 0 ? videoUrl.slice(9) : videoUrl;
  const { data, error } = await admin.storage.from("episodes").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error("não consegui gerar URL do vídeo no storage");
  return data.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { episode_id, caption } = await req.json();
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single();
    if (!ep) return json({ error: "episódio não encontrado" }, 404);
    if (!ep.video_url) return json({ error: "episódio sem vídeo renderizado (video_url vazio)" }, 400);

    const { data: tok } = await admin.from("social_tokens").select("*").eq("user_id", user.id).eq("platform", "instagram").single();
    if (!tok) return json({ error: "Instagram não conectado. Vá em Conexões." }, 400);
    const igId = (tok.meta as any)?.ig_user_id;
    if (!igId) return json({ error: "conta IG sem id; reconecte o Instagram." }, 400);
    const access = tok.access_token as string;

    const vurl = await signedVideoUrl(admin, ep.video_url);
    const tags = Array.isArray(ep.hashtags) ? ep.hashtags.join(" ") : "";
    const cap = [caption ?? ep.caption ?? "", tags].filter(Boolean).join("  ").slice(0, 2100);

    const createParams = new URLSearchParams({ media_type: "REELS", video_url: vurl, caption: cap, access_token: access });
    const cRes = await fetch(GRAPH + "/" + igId + "/media", { method: "POST", body: createParams });
    const cJson = await cRes.json();
    if (!cRes.ok || !cJson.id) return json({ error: "falha ao criar container IG: " + JSON.stringify(cJson).slice(0, 250) }, 502);
    const containerId = cJson.id as string;

    let status = "IN_PROGRESS", tries = 0;
    while (status !== "FINISHED" && status !== "ERROR" && tries < 30) {
      await sleep(3000);
      const sRes = await fetch(GRAPH + "/" + containerId + "?fields=status_code&access_token=" + access);
      const sJson = await sRes.json();
      status = sJson.status_code ?? status;
      tries++;
    }
    if (status !== "FINISHED") return json({ error: "processamento do Reel não finalizou (status " + status + ")" }, 502);

    const pParams = new URLSearchParams({ creation_id: containerId, access_token: access });
    const pRes = await fetch(GRAPH + "/" + igId + "/media_publish", { method: "POST", body: pParams });
    const pJson = await pRes.json();
    if (!pRes.ok || !pJson.id) return json({ error: "falha ao publicar no IG: " + JSON.stringify(pJson).slice(0, 250) }, 502);
    const mediaId = pJson.id as string;

    let permalink = "";
    try {
      const lk = await fetch(GRAPH + "/" + mediaId + "?fields=permalink&access_token=" + access);
      const lj = await lk.json(); permalink = lj.permalink ?? "";
    } catch (_) {}

    const { data: existing } = await admin.from("scheduled_posts").select("id").eq("episode_id", episode_id).eq("network", "instagram").maybeSingle();
    if (existing) await admin.from("scheduled_posts").update({ status: "published", external_id: mediaId, scheduled_at: new Date().toISOString() }).eq("id", existing.id);
    else await admin.from("scheduled_posts").insert({ user_id: user.id, episode_id, network: "instagram", scheduled_at: new Date().toISOString(), status: "published", external_id: mediaId });

    return json({ url: permalink || ("https://www.instagram.com/"), id: mediaId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
