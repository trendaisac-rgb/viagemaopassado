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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { episode_id } = await req.json();
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single();
    if (!ep) return json({ error: "episódio não encontrado" }, 404);
    const sb: any[] = Array.isArray(ep.storyboard) ? ep.storyboard : [];
    if (!sb.length) return json({ error: "episódio sem storyboard. Gere o roteiro primeiro." }, 400);

    const { data: cr } = await admin.from("integration_credentials").select("client_secret").eq("platform", "openai").maybeSingle();
    const key = cr?.client_secret ?? Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "Configure a OpenAI (API Key) em Conexões → IA." }, 400);

    const targets: number[] = [];
    for (let i = 0; i < sb.length && targets.length < 4; i++) {
      const v = sb[i]?.visual;
      if (v === "imagem" || v === "video") targets.push(i);
    }

    let made = 0;
    for (const i of targets) {
      const desc = String(sb[i]?.desc ?? sb[i]?.narr ?? "cena histórica");
      const prompt = (desc + " — fotografia cinematográfica, atmosfera escura azul-petróleo e dourado, 9:16 vertical, sem texto, sem marca, alta qualidade.").slice(0, 3900);
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1792", quality: "standard", response_format: "url" }),
      });
      const jr = await r.json();
      if (!r.ok) return json({ error: "OpenAI: " + JSON.stringify(jr).slice(0, 240) }, 502);
      const url = jr.data?.[0]?.url;
      if (!url) continue;
      const img = await fetch(url);
      const bytes = new Uint8Array(await img.arrayBuffer());
      const path = ep.user_id + "/" + ep.id + "-b" + i + ".png";
      const up = await admin.storage.from("episodes").upload(path, bytes, { contentType: "image/png", upsert: true });
      if (!up.error) { sb[i].image = path; made++; }
    }

    await admin.from("episodes").update({ storyboard: sb }).eq("id", ep.id);
    return json({ ok: true, made });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
