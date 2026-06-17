# Pipeline: gerar -> renderizar -> publicar (YouTube)

1. **Gerar (Estúdio)** — tema -> ângulo -> roteiro -> legenda (IA via `ai-generate`). Cria a linha em `episodes`.
2. **Renderizar (skill `vap-video-remotion`, sandbox)** — produz o MP4 9:16 (Remotion + ElevenLabs), seguindo a Lei da Edição.
3. **Bridge render -> Storage** — `node scripts/upload-render.mjs <userId> <episodeId> <mp4>`:
   sobe o arquivo pro bucket privado `episodes/{userId}/{episodeId}.mp4` e seta `episodes.video_url` + `status='ready'`.
4. **Publicar (`youtube-publish`)** — o app chama a função com `{ episode_id }`; ela renova o token do YouTube,
   baixa o MP4 do Storage e faz **upload resumable** pra YouTube Data API v3, marca `episodes.status='published'`
   e grava o `external_id` (id do vídeo) em `scheduled_posts`.

## Pré-requisitos
- YouTube conectado em Conexões (linha em `social_tokens`) — ver `docs/OAUTH_SETUP.md`.
- Secrets `YOUTUBE_CLIENT_ID/SECRET` no Supabase.
- Bucket `episodes` (migration `20260617231015_episodes_storage_bucket.sql`).

## Exemplo de chamada (no app)
    const { data, error } = await supabase.functions.invoke("youtube-publish", {
      body: { episode_id, privacy: "public" },
    });
    // data = { url: "https://youtu.be/...", id, privacy }

## Observações
- App do YouTube **não verificado** => o vídeo sobe **privado** até a verificação do Google, mesmo pedindo `public`.
- `privacy`: `public` (padrão), `unlisted` ou `private`.
- A função carrega o MP4 em memória (ok para Shorts; vídeos grandes pedem upload chunked no futuro).
- Próximo passo de UI: botão "Publicar no YouTube" no Estúdio/Episódios chamando a função.
