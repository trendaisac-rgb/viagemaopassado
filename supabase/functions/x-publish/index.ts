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

async function refreshX(admin: any, tok: any): Promise<string> {
  const exp = tok.expires_at ? Date.parse(tok.expires_at) : 0;
  if (tok.access_token && exp - Date.now() > 120000) return tok.access_token;
  if (!tok.refresh_token) {
    if (tok.access_token) return tok.access_token;
    throw new Error("Sem refresh_token; reconecte o X em Conexões.");
  }
  const id = Deno.env.get("X_CLIENT_ID")!, sec = Deno.env.get("X_CLIENT_SECRET")!;
  const basic = btoa(`${id}:${sec}`);
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok.refresh_token, client_id: id });
  const r = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` }, body });
  const t = await r.json();
  if (!r.ok) throw new Error(t.error_description || "falha ao renovar token do X");
  const access = t.access_token as string;
  const newRefresh = t.refresh_token ?? tok.refresh_token;
  const expires_at = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from("social_tokens").update({ access_token: access, refresh_token: newRefresh, expires_at, updated_at: new Date().toISOString() }).eq("user_id", tok.user_id).eq("platform", "x");
  return access;
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

    const r = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: content }),
    });
    const t = await r.json();
    if (!r.ok || !t.data?.id) return json({ error: "falha ao postar no X: " + JSON.stringify(t).slice(0, 300) }, 502);
    const id = t.data.id as string;

    const { data: existing } = await admin.from("scheduled_posts").select("id").eq("episode_id", episode_id).eq("network", "x").maybeSingle();
    if (existing) await admin.from("scheduled_posts").update({ status: "published", external_id: id, scheduled_at: new Date().toISOString() }).eq("id", existing.id);
    else await admin.from("scheduled_posts").insert({ user_id: user.id, episode_id, network: "x", scheduled_at: new Date().toISOString(), status: "published", external_id: id });

    return json({ url: `https://twitter.com/i/web/status/${id}`, id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
