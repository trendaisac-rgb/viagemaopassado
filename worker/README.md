# VaP Render Worker

Worker que renderiza os Shorts 9:16 do Viagem ao Passado e sobe pro portal.
Roda na **sua máquina** ou num servidor. Pega episódios da fila (`render_jobs`),
renderiza com Remotion (roteiro + narração → MP4 da marca) e atualiza `episode.video_url`.

## Rodar
1. Instale Node 18+ e ffmpeg.
2. `cd worker && npm install`
3. Copie `.env.example` para `.env` e cole a **SUPABASE_SERVICE_ROLE_KEY**
   (Supabase → Project Settings → API → service_role). Não comite o `.env`.
4. `npm start`

Deixe rodando. Quando você clicar **Renderizar** num episódio (que já tenha
**roteiro** + **narração**), o worker pega, renderiza e o vídeo aparece no portal.

## O que ele renderiza hoje (v1)
Vídeo 9:16 1080×1920 30fps, fundo escuro + dourado, fonte Anton/Inter:
gancho → beats do roteiro (cada `[CORTE]` vira um corte) com legendas e slams →
CTA "+ SEGUIR", tudo sincronizado por cima da narração (lead de 1,5s).

## Upgrade para o padrão EP008 (cinematográfico completo)
Esta é a base. Para chegar no nível do EP008 (heróis de IA + clipes Veo +
biblioteca de cenas vetoriais), troque a composição `remotion/EpisodeVideo.tsx`
pelas cenas do `vap-remotion-engine` (a skill `vap-video-remotion`) e gere os
assets de IA. O worker (fila, upload, status) continua igual.
