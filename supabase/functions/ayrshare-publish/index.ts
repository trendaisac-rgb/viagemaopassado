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

// nosso network -> nome de plataforma no Ayrshare
const PLAT: Record<string,string> = { x: "twitter", youtube: "youtube", instagram: "instagram", tiktok: "tiktok" };

async function publicUrl(admin: any, videoUrl: string): Promise<string> {
  if (videoUrl.startsWith("http")) return videoUrl;
  const path = videoUrl.indexOf("episodes/") === 0 ? videoUrl.slice(9) : videoUrl;
  const { data, error } = await admin.storage.from("episodes").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error("nao consegui gerar URL do video no storage");
  return data.signedUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authz = req.headers.get("Authorization") ?? "";
    const isService = authz === "Bearer " + SERVICE;
    const reqBody = await req.json().catch(() => ({}));
    const { episode_id, platforms } = reqBody as { episode_id?: string; platforms?: string[] };
    let uid = "";
    if (isService) { uid = (reqBody as any).user_id; }
    else {
      const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: authz } } });
      const gu = await userClient.auth.getUser();
      if (!gu.data.user) return json({ error: "nao autenticado" }, 401);
      uid = gu.data.user.id;
    }
    if (!uid) return json({ error: "user_id faltando" }, 400);
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);

    const { data: cred } = await admin.from("integration_credentials").select("client_secret").eq("platform", "ayrshare").maybeSingle();
    const apiKey = cred?.client_secret ?? Deno.env.get("AYRSHARE_API_KEY");
    if (!apiKey) return json({ error: "Configure a API key do Ayrshare em Conexões." }, 400);

    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", uid).single();
    if (!ep) return json({ error: "episodio nao encontrado" }, 404);
    if (!ep.video_url) return json({ error: "episodio sem video renderizado" }, 400);

    const nets = (Array.isArray(platforms) && platforms.length ? platforms : ["x", "youtube", "instagram", "tiktok"]);
    const ayPlatforms = [...new Set(nets.map((n) => PLAT[n]).filter(Boolean))];
    if (ayPlatforms.length === 0) return json({ error: "nenhuma plataforma valida" }, 400);

    const url = await publicUrl(admin, ep.video_url);
    const base = (ep.caption ?? ep.title ?? "").toString();
    const tags = Array.isArray(ep.hashtags) ? ep.hashtags.join(" ") : "";
    const post = (tags ? base + " " + tags : base).trim().slice(0, 2000) || (ep.title ?? "Viagem ao Passado");

    const payload: any = {
      post,
      platforms: ayPlatforms,
      mediaUrls: [url],
      isVideo: true,
      youTubeOptions: { title: String(ep.title ?? "Viagem ao Passado").slice(0, 100), visibility: "public" },
    };

    const r = await fetch("https://api.ayrshare.com/api/post", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await r.json();
    if (!r.ok || (out.status && out.status === "error")) {
      return json({ error: "Ayrshare recusou: " + JSON.stringify(out).slice(0, 400) }, 502);
    }

    // registra um scheduled_posts por plataforma como publicado
    const topId = out.id ?? out.postIds?.[0]?.id ?? null;
    for (const n of nets) {
      if (!PLAT[n]) continue;
      const { data: existing } = await admin.from("scheduled_posts").select("id").eq("episode_id", episode_id).eq("network", n).maybeSingle();
      if (existing) await admin.from("scheduled_posts").update({ status: "published", external_id: topId, scheduled_at: new Date().toISOString() }).eq("id", existing.id);
      else await admin.from("scheduled_posts").insert({ user_id: uid, episode_id, network: n, scheduled_at: new Date().toISOString(), status: "published", external_id: topId });
    }
    await admin.from("episodes").update({ status: "published" }).eq("id", episode_id);

    return json({ ok: true, id: topId, platforms: ayPlatforms, ayrshare: out.postIds ?? out });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
