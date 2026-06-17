// Bridge render -> Storage -> episode.video_url
// Rode no pipeline de render (sandbox) depois de gerar o MP4:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/upload-render.mjs <userId> <episodeId> <caminho-do-mp4>
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const [, , userId, episodeId, filePath] = process.argv;
if (!userId || !episodeId || !filePath) {
  console.error("uso: node scripts/upload-render.mjs <userId> <episodeId> <mp4>");
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const bytes = await readFile(filePath);
const objectPath = `${userId}/${episodeId}.mp4`;
const { error: upErr } = await admin.storage.from("episodes").upload(objectPath, bytes, { contentType: "video/mp4", upsert: true });
if (upErr) { console.error("upload falhou:", upErr.message); process.exit(1); }
const { error: dbErr } = await admin
  .from("episodes")
  .update({ video_url: objectPath, status: "ready", progress_pct: 100, progress_step: "pronto" })
  .eq("id", episodeId).eq("user_id", userId);
if (dbErr) { console.error("update do episódio falhou:", dbErr.message); process.exit(1); }
console.log("OK -> episodes/" + objectPath);
