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
const PLATFORMS = ["youtube", "x", "instagram", "tiktok", "ayrshare"];
const ENV_ID: Record<string,string> = { youtube: "YOUTUBE_CLIENT_ID", x: "X_CLIENT_ID", instagram: "INSTAGRAM_CLIENT_ID", tiktok: "TIKTOK_CLIENT_KEY" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const admin = createClient(SUPA_URL, SERVICE);
    const { action, platform, client_id, client_secret } = await req.json();

    if (action === "status") {
      const { data } = await admin.from("integration_credentials").select("platform, client_id, client_secret");
      const configured: Record<string, boolean> = {};
      for (const p of PLATFORMS) configured[p] = false;
      for (const row of (data ?? [])) {
        const hasId = Boolean(row.client_id);
        const hasSec = row.platform === "ayrshare" ? true : Boolean(row.client_secret);
        configured[row.platform] = hasId && hasSec;
      }
      for (const [p, e] of Object.entries(ENV_ID)) if (Deno.env.get(e)) configured[p] = true;
      return json({ configured });
    }

    if (action === "save") {
      if (!PLATFORMS.includes(platform)) return json({ error: "plataforma inválida" }, 400);
      await admin.from("integration_credentials").upsert({ platform, client_id: client_id ?? null, client_secret: client_secret ?? null, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }

    if (action === "clear") {
      if (!PLATFORMS.includes(platform)) return json({ error: "plataforma inválida" }, 400);
      await admin.from("integration_credentials").delete().eq("platform", platform);
      return json({ ok: true });
    }

    return json({ error: "ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
