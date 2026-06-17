import { createClient } from "jsr:@supabase/supabase-js@2";

const cors: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CB = `${SUPA_URL}/functions/v1/social-oauth-callback`;
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function b64url(bytes: Uint8Array) {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function pkce() {
  const arr = new Uint8Array(48); crypto.getRandomValues(arr);
  const verifier = b64url(arr);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge: b64url(digest) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { platform } = await req.json();
    if (!platform) return json({ error: "platform faltando" }, 400);
    const admin = createClient(SUPA_URL, SERVICE);

    let code_verifier: string | null = null, challenge = "";
    if (platform === "x") { const p = await pkce(); code_verifier = p.verifier; challenge = p.challenge; }
    const { data: st, error: se } = await admin.from("oauth_state").insert({ user_id: user.id, platform, code_verifier }).select("state").single();
    if (se || !st) return json({ error: "falha ao criar state" }, 500);
    const state = st.state as string;

    let url = "";
    if (platform === "youtube") {
      const cid = Deno.env.get("YOUTUBE_CLIENT_ID");
      if (!cid) return json({ error: "Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET nos secrets do Supabase." }, 400);
      const p = new URLSearchParams({ client_id: cid, redirect_uri: CB, response_type: "code", scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly", access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
      url = `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
    } else if (platform === "x") {
      const cid = Deno.env.get("X_CLIENT_ID");
      if (!cid) return json({ error: "Configure X_CLIENT_ID e X_CLIENT_SECRET nos secrets do Supabase." }, 400);
      const p = new URLSearchParams({ response_type: "code", client_id: cid, redirect_uri: CB, scope: "tweet.read tweet.write users.read media.write offline.access", state, code_challenge: challenge, code_challenge_method: "S256" });
      url = `https://twitter.com/i/oauth2/authorize?${p}`;
    } else if (platform === "instagram") {
      const cid = Deno.env.get("INSTAGRAM_CLIENT_ID");
      if (!cid) return json({ error: "Configure INSTAGRAM_CLIENT_ID e INSTAGRAM_CLIENT_SECRET nos secrets do Supabase." }, 400);
      const p = new URLSearchParams({ client_id: cid, redirect_uri: CB, response_type: "code", scope: "instagram_business_basic,instagram_business_content_publish", state });
      url = `https://www.instagram.com/oauth/authorize?${p}`;
    } else if (platform === "tiktok") {
      const ck = Deno.env.get("TIKTOK_CLIENT_KEY");
      if (!ck) return json({ error: "Configure TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET nos secrets do Supabase." }, 400);
      const p = new URLSearchParams({ client_key: ck, redirect_uri: CB, response_type: "code", scope: "user.info.basic,video.publish", state });
      url = `https://www.tiktok.com/v2/auth/authorize/?${p}`;
    } else {
      return json({ error: "rede não suportada" }, 400);
    }
    return json({ url });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
