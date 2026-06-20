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

// constroi cues (legendas) a partir do alinhamento por caractere do ElevenLabs:
// agrupa em palavras e depois em blocos de ate 5 palavras, quebrando em fim de frase.
function buildCues(al: any) {
  const chars: string[] = al?.characters ?? [];
  const st: number[] = al?.character_start_times_seconds ?? [];
  const en: number[] = al?.character_end_times_seconds ?? [];
  const words: { t: string; s: number; e: number }[] = [];
  let cur = "", s = -1, e = -1;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === " " || c === "\n" || c === "\t") {
      if (cur) { words.push({ t: cur, s, e }); cur = ""; s = -1; e = -1; }
      continue;
    }
    if (!cur) s = st[i] ?? 0;
    cur += c;
    e = en[i] ?? e;
  }
  if (cur) words.push({ t: cur, s, e });

  const cues: { start: number; end: number; text: string }[] = [];
  let buf: { t: string; s: number; e: number }[] = [];
  let bs = -1;
  const flush = () => {
    if (buf.length) {
      cues.push({ start: Math.max(0, bs), end: buf[buf.length - 1].e, text: buf.map((w) => w.t).join(" ") });
      buf = []; bs = -1;
    }
  };
  for (const w of words) {
    if (!buf.length) bs = w.s;
    buf.push(w);
    const endsSentence = w.t.endsWith(".") || w.t.endsWith("?") || w.t.endsWith("!") || w.t.endsWith("…") || w.t.endsWith(",");
    if (buf.length >= 5 || (endsSentence && buf.length >= 3)) flush();
  }
  flush();
  return cues;
}

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

    const text = String(ep.script).split("[CORTE]").join(" ").split("  ").join(" ").trim();

    // with-timestamps: retorna o audio (base64) E o alinhamento por caractere
    const ttsRes = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voiceId + "/with-timestamps", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true },
      }),
    });
    if (!ttsRes.ok) { const e = await ttsRes.text(); return json({ error: "ElevenLabs: " + e.slice(0, 240) }, 502); }
    const tj = await ttsRes.json();
    const b64 = tj.audio_base64 ?? tj.audio;
    if (!b64) return json({ error: "ElevenLabs nao retornou audio" }, 502);
    const bin = atob(b64);
    const audio = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) audio[i] = bin.charCodeAt(i);

    const cues = buildCues(tj.alignment ?? tj.normalized_alignment ?? {});

    const path = uid + "/" + episode_id + ".mp3";
    const up = await admin.storage.from("episodes").upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (up.error) return json({ error: "upload da narracao falhou: " + up.error.message }, 502);
    await admin.from("episodes").update({ narration_url: path, cues }).eq("id", episode_id);

    return json({ ok: true, narration_url: path, bytes: audio.length, cues: cues.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
