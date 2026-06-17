import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CB = `${SUPA_URL}/functions/v1/social-oauth-callback`;
const APP = Deno.env.get("APP_URL") ?? "http://localhost:8080";
const redir = (path: string) => new Response(null, { status: 302, headers: { Location: `${APP}${path}` } });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const oerr = u.searchParams.get("error");
  const admin = createClient(SUPA_URL, SERVICE);
  if (oerr || !code || !state) return redir(`/conexoes?error=${encodeURIComponent(oerr ?? "missing")}`);

  const { data: st } = await admin.from("oauth_state").select("*").eq("state", state).single();
  if (!st) return redir(`/conexoes?error=state`);
  const platform = st.platform as string;

  try {
    let access = "", refresh: string | null = null, scope: string | null = null, handle: string | null = null;
    let expires_at: string | null = null;

    if (platform === "youtube") {
      const id = Deno.env.get("YOUTUBE_CLIENT_ID")!, sec = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
      const body = new URLSearchParams({ code, client_id: id, client_secret: sec, redirect_uri: CB, grant_type: "authorization_code" });
      const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const t = await r.json();
      if (!r.ok) throw new Error(t.error_description || "token youtube");
      access = t.access_token; refresh = t.refresh_token ?? null; scope = t.scope ?? null;
      if (t.expires_in) expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString();
      try {
        const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${access}` } });
        const cj = await ch.json(); const title = cj.items?.[0]?.snippet?.title; if (title) handle = title;
      } catch (_) {}
    } else if (platform === "x") {
      const id = Deno.env.get("X_CLIENT_ID")!, sec = Deno.env.get("X_CLIENT_SECRET")!;
      const basic = btoa(`${id}:${sec}`);
      const body = new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: CB, code_verifier: st.code_verifier ?? "" });
      const r = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` }, body });
      const t = await r.json();
      if (!r.ok) throw new Error(t.error_description || "token x");
      access = t.access_token; refresh = t.refresh_token ?? null; scope = t.scope ?? null;
      if (t.expires_in) expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString();
      try {
        const me = await fetch("https://api.twitter.com/2/users/me", { headers: { Authorization: `Bearer ${access}` } });
        const mj = await me.json(); if (mj.data?.username) handle = `@${mj.data.username}`;
      } catch (_) {}
    } else {
      return redir(`/conexoes?error=unsupported`);
    }

    await admin.from("social_tokens").upsert({ user_id: st.user_id, platform, access_token: access, refresh_token: refresh, expires_at, scope, updated_at: new Date().toISOString() });
    await admin.from("networks").upsert({ user_id: st.user_id, network: platform, status: "connected", handle, connected_at: new Date().toISOString() }, { onConflict: "user_id,network" });
    await admin.from("oauth_state").delete().eq("state", state);
    return redir(`/conexoes?connected=${platform}`);
  } catch (e) {
    return redir(`/conexoes?error=${encodeURIComponent((e as Error).message)}`);
  }
});
