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
const today = () => new Date().toISOString().slice(0, 10);

async function creds(admin: any, platform: string, envId: string, envSec: string) {
  const { data } = await admin.from("integration_credentials").select("client_id, client_secret").eq("platform", platform).maybeSingle();
  return { id: data?.client_id ?? Deno.env.get(envId) ?? "", secret: data?.client_secret ?? Deno.env.get(envSec) ?? "" };
}

async function refreshYouTube(admin: any, tok: any): Promise<string> {
  const exp = tok.expires_at ? Date.parse(tok.expires_at) : 0;
  if (tok.access_token && exp - Date.now() > 120000) return tok.access_token;
  if (!tok.refresh_token) { if (tok.access_token) return tok.access_token; throw new Error("sem refresh_token; reconecte o YouTube"); }
  const c = await creds(admin, "youtube", "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET");
  const body = new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: tok.refresh_token, grant_type: "refresh_token" });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const t = await r.json();
  if (!r.ok) throw new Error(t.error_description || "falha ao renovar token do YouTube");
  const access = t.access_token as string;
  const expires_at = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from("social_tokens").update({ access_token: access, expires_at, updated_at: new Date().toISOString() }).eq("user_id", tok.user_id).eq("platform", "youtube");
  return access;
}

async function refreshX(admin: any, tok: any): Promise<string> {
  const exp = tok.expires_at ? Date.parse(tok.expires_at) : 0;
  if (tok.access_token && exp - Date.now() > 120000) return tok.access_token;
  if (!tok.refresh_token) { if (tok.access_token) return tok.access_token; throw new Error("sem refresh_token; reconecte o X"); }
  const c = await creds(admin, "x", "X_CLIENT_ID", "X_CLIENT_SECRET");
  const basic = btoa(c.id + ":" + c.secret);
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok.refresh_token, client_id: c.id });
  const r = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basic }, body });
  const t = await r.json();
  if (!r.ok) throw new Error(t.error_description || "falha ao renovar token do X");
  const access = t.access_token as string;
  const newRefresh = t.refresh_token ?? tok.refresh_token;
  const expires_at = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from("social_tokens").update({ access_token: access, refresh_token: newRefresh, expires_at, updated_at: new Date().toISOString() }).eq("user_id", tok.user_id).eq("platform", "x");
  return access;
}

async function upsertChannelMetric(admin: any, uid: string, network: string, fields: { followers?: number; views?: number }) {
  const d = today();
  const { data: ex } = await admin.from("metrics").select("id").eq("user_id", uid).eq("network", network).eq("date", d).is("episode_id", null).maybeSingle();
  const row: any = { user_id: uid, network, date: d, episode_id: null, ...fields };
  if (ex) await admin.from("metrics").update(fields).eq("id", ex.id);
  else await admin.from("metrics").insert(row);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authz = req.headers.get("Authorization") ?? "";
    const isService = authz === "Bearer " + SERVICE;
    const reqBody = await req.json().catch(() => ({}));
    let uid = "";
    if (isService) { uid = (reqBody as any).user_id; }
    else {
      const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: authz } } });
      const gu = await userClient.auth.getUser();
      if (!gu.data.user) return json({ error: "nao autenticado" }, 401);
      uid = gu.data.user.id;
    }
    if (!uid) return json({ error: "user_id faltando" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const results: Record<string, unknown> = {};

    try {
      const { data: tok } = await admin.from("social_tokens").select("*").eq("user_id", uid).eq("platform", "youtube").maybeSingle();
      if (tok) {
        const access = await refreshYouTube(admin, tok);
        const r = await fetch("https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true", { headers: { Authorization: "Bearer " + access } });
        const d = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 200));
        const st = d?.items?.[0]?.statistics;
        if (st) {
          const followers = Number(st.subscriberCount ?? 0);
          const views = Number(st.viewCount ?? 0);
          await upsertChannelMetric(admin, uid, "youtube", { followers, views });
          results.youtube = { followers, views, videos: Number(st.videoCount ?? 0) };
        } else results.youtube = { note: "sem canal" };
      } else results.youtube = { note: "nao conectado" };
    } catch (e) { results.youtube = { error: (e as Error).message }; }

    try {
      const { data: tok } = await admin.from("social_tokens").select("*").eq("user_id", uid).eq("platform", "x").maybeSingle();
      if (tok) {
        const access = await refreshX(admin, tok);
        const r = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", { headers: { Authorization: "Bearer " + access } });
        const d = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 200));
        const pm = d?.data?.public_metrics;
        if (pm) {
          const followers = Number(pm.followers_count ?? 0);
          await upsertChannelMetric(admin, uid, "x", { followers });
          results.x = { followers, tweets: Number(pm.tweet_count ?? 0) };
        } else results.x = { note: "sem perfil" };
      } else results.x = { note: "nao conectado" };
    } catch (e) { results.x = { error: (e as Error).message }; }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
