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
    let meta: Record<string, unknown> = {};

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
    } else if (platform === "instagram") {
      const id = Deno.env.get("INSTAGRAM_CLIENT_ID")!, sec = Deno.env.get("INSTAGRAM_CLIENT_SECRET")!;
      const form = new URLSearchParams({ client_id: id, client_secret: sec, grant_type: "authorization_code", redirect_uri: CB, code });
      const r = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      const t = await r.json();
      if (!r.ok || !t.access_token) throw new Error(t.error_message || t.error || "token instagram");
      meta = { ig_user_id: String(t.user_id ?? "") };
      const llRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${sec}&access_token=${t.access_token}`);
      const ll = await llRes.json();
      access = ll.access_token ?? t.access_token;
      if (ll.expires_in) expires_at = new Date(Date.now() + ll.expires_in * 1000).toISOString();
      try {
        const me = await fetch(`https://graph.instagram.com/me?fields=user_id,username&access_token=${access}`);
        const mj = await me.json(); if (mj.username) handle = `@${mj.username}`; if (mj.user_id) meta.ig_user_id = String(mj.user_id);
      } catch (_) {}
    } else if (platform === "tiktok") {
      const ck = Deno.env.get("TIKTOK_CLIENT_KEY")!, sec = Deno.env.get("TIKTOK_CLIENT_SECRET")!;
      const form = new URLSearchParams({ client_key: ck, client_secret: sec, code, grant_type: "authorization_code", redirect_uri: CB });
      const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      const t = await r.json();
      if (!r.ok || !t.access_token) throw new Error(t.error_description || t.error || "token tiktok");
      access = t.access_token; refresh = t.refresh_token ?? null; scope = t.scope ?? null;
      if (t.expires_in) expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString();
      meta = { open_id: t.open_id ?? "" };
      try {
        const me = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", { headers: { Authorization: `Bearer ${access}` } });
        const mj = await me.json(); const dn = mj.data?.user?.display_name; if (dn) handle = dn;
      } catch (_) {}
    } else {
      return redir(`/conexoes?error=unsupported`);
    }

    await admin.from("social_tokens").upsert({ user_id: st.user_id, platform, access_token: access, refresh_token: refresh, expires_at, scope, meta, updated_at: new Date().toISOString() });
    await admin.from("networks").upsert({ user_id: st.user_id, network: platform, status: "connected", handle, connected_at: new Date().toISOString() }, { onConflict: "user_id,network" });
    await admin.from("oauth_state").delete().eq("state", state);
    return redir(`/conexoes?connected=${platform}`);
  } catch (e) {
    return redir(`/conexoes?error=${encodeURIComponent((e as Error).message)}`);
  }
});
