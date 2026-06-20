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
    const authz = req.headers.get("Authorization") ?? "";
    const isService = authz === "Bearer " + SERVICE;
    const body = await req.json().catch(() => ({}));
    const episode_id = (body as any).episode_id;
    let uid = "";
    if (isService) { uid = (body as any).user_id; }
    else {
      const userClient = createClient(SUPA_URL, ANON, { global: { headers: { Authorization: authz } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "nao autenticado" }, 401);
      uid = user.id;
    }
    if (!uid) return json({ error: "user_id faltando" }, 400);
    if (!episode_id) return json({ error: "episode_id faltando" }, 400);

    const admin = createClient(SUPA_URL, SERVICE);
    const { data: ep } = await admin.from("episodes").select("*").eq("id", episode_id).eq("user_id", uid).single();
    if (!ep) return json({ error: "episodio nao encontrado" }, 404);
    if (!ep.script) return json({ error: "episodio sem roteiro. Gere o roteiro no Estudio primeiro." }, 400);

    const { data: cr } = await admin.from("integration_credentials").select("client_id, client_secret").eq("platform", "elevenlabs").maybeSingle();
    const voiceId = cr?.client_id ?? Deno.env.get("ELEVENLABS_VOICE_ID");
    const apiKey = cr?.client_secret ?? Deno.env.get("ELEVENLABS_API_KEY");
    if (!voiceId || !apiKey) return json({ error: "Configure o ElevenLabs (Voice ID + API Key) em Conexoes." }, 400);

    const text = String(ep.script).split("[CORTE]").join(" ").trim();

    const ttsRes = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voiceId, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true },
      }),
    });
    if (!ttsRes.ok) { const e = await ttsRes.text(); return json({ error: "ElevenLabs: " + e.slice(0, 240) }, 502); }
    const audio = new Uint8Array(await ttsRes.arrayBuffer());

    const path = uid + "/" + episode_id + ".mp3";
    const up = await admin.storage.from("episodes").upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (up.error) return json({ error: "upload da narracao falhou: " + up.error.message }, 502);
    await admin.from("episodes").update({ narration_url: path }).eq("id", episode_id);

    return json({ ok: true, narration_url: path, bytes: audio.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
