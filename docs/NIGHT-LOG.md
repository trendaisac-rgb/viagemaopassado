# NIGHT-LOG — trabalho noturno 17→18/06/2026

Trabalhei em loop a noite toda. Tudo commitado e **pushado pro `main`** (Lovable sincroniza). Abaixo: o que ficou pronto, a análise crítica honesta, e o roteiro das próximas rodadas.

## O que construí (commits no `main`)
- `368f966` — **sem tela de login**: conta-portal com login automático (não depende de toggle no Supabase).
- `934638b` — **youtube-publish** (upload resumable) + bridge de render (bucket `episodes` + `scripts/upload-render.mjs`).
- `3503852` — **x-publish** (texto) + Estúdio "Publicar agora" real.
- `601cbda` — **X vídeo nativo** (upload chunked) + escopo `media.write`.
- `a0b83d9` — **Instagram + TikTok no OAuth** (4 redes conectáveis pelo botão).
- `48390eb` — **instagram-publish** (Reels) + **tiktok-publish** (Content Posting).
- `74e6cb3` — UI: Estúdio publica nas 4; botão "Publicar nas conectadas" por episódio.
- `123e1a9` — **credenciais dentro do portal** (Conexões → Configurar apps) — fim do "configure no Supabase".
- `a3ec634` — **motor de ideias**: tabela + função `generate-ideas` (IA c/ fallback) + página **Ideias** (fila, gerar, sugerir, aprovar).

## Estado atual do portal
- **10 edge functions** no ar: `ai-generate`, `bootstrap-portal`, `social-oauth-start`, `social-oauth-callback`, `youtube-publish`, `x-publish`, `instagram-publish`, `tiktok-publish`, `integrations`, `generate-ideas`.
- **Tabelas**: profiles, user_roles, episodes, networks, scheduled_posts, metrics, comments, ai_jobs, oauth_state, social_tokens, **integration_credentials**, **content_ideas** + bucket `episodes`.
- **Telas**: Painel, Estúdio, Episódios, Agenda, Comentários, Análises, **Conexões (com Configurar apps)**, Ajustes, **Ideias**.

## Status — o que funciona vs. o que falta
| Item | Estado |
|---|---|
| Entrar sem login (portal) | ✅ funciona |
| Conectar 4 redes pelo portal (colar chave → autorizar) | ✅ pronto — **falta você criar os apps e colar as chaves** |
| Publicar YouTube / X (texto+vídeo) | ✅ código pronto — precisa: conta conectada + MP4 no storage |
| Publicar Instagram / TikTok | 🟡 código pronto — precisa: **revisão Meta / auditoria TikTok** (ou Ayrshare) |
| Motor de ideias (gerar/sugerir/aprovar) | ✅ funciona (IA real precisa de `LOVABLE_API_KEY`; sem ela, usa fallback) |
| Render do vídeo (gerar o MP4) | 🔴 **precisa de worker externo** (ver Rodada 3) |
| Agendamento automático (2/dia no horário) | 🔴 desenhado, **Rodada 4** |

## Análise crítica honesta (o que está bom, o que NÃO está)
**Forte:** o fluxo "clica → autoriza" agora é de verdade e configurável dentro do portal; arquitetura limpa; RLS sólido; segredos nunca vão pro browser; tudo versionado e pushado.

**Frágil / não testado (sou honesto):**
- As funções de publish de **IG/TikTok e o vídeo da X** eu **não consegui testar** (não há conta conectada nem MP4 renderizado, e o sandbox não alcança as APIs). O endpoint de mídia v2 da X é novo e com arestas — espere **1 ajuste** no primeiro uso real de cada rede. Deixei erros claros em cada etapa pra eu iterar rápido.
- A página **Ideias** é uma rota nova; depende do build do Lovable regenerar o `routeTree`. Deve funcionar (é o padrão do TanStack Start), mas se a aba não aparecer, me avisa que eu forço.

**Bloqueios externos (não são código — só você resolve):**
1. **Apps de desenvolvedor + chaves** de cada rede (suas contas). Inevitável — todo app que posta fez isso uma vez.
2. **Worker de render**: o MP4 é feito pelo pipeline Remotion + ElevenLabs (a skill `vap-video-remotion`). Isso **não roda dentro do Supabase** (é pesado: Chromium, ffmpeg, IA). Precisa rodar num "worker" (sua máquina ou um servidor). O portal já tem o elo pronto (`upload-render.mjs` → `episode.video_url`); falta o worker que executa a skill.
3. **`LOVABLE_API_KEY`** (ou chave de LLM) pra IA sair do mock.

## Roteiro das próximas rodadas (continuo nelas)
- **Rodada 3 — Render no automático:** fila `render_jobs` + um **worker Node de exemplo** que pega o job, roda a skill (Remotion+ElevenLabs), e sobe o MP4 via `upload-render.mjs`. Liga o Estúdio à fila de Ideias (tema aprovado → roteiro → render). É o elo que falta pra "2 vídeos/dia".
- **Rodada 4 — Agendador + Dashboard:** `pg_cron` + `scheduler-run` publica os agendados no horário; Agenda vira calendário real; Painel repaginado (estilo produto: KPIs, gráficos por rede).
- **Rodada 5 — White-label + métricas + QA:** workspaces por criador (multi-tenant), opção **Ayrshare** (unified-publish), ingestão de métricas reais, e o passe de QA que conserta os fluxos de publish assim que houver conta+vídeo reais.

## Sua checklist (manhã)
1. ☐ Conectar **YouTube** seguindo `SUA-PARTE.md` (grátis, ~10 min) — pra ver funcionando.
2. ☐ Me dizer qualquer erro que aparecer (eu conserto na hora).
3. ☐ Decidir IG/TikTok: revisão própria **ou** Ayrshare.
4. ☐ Decidir onde roda o **worker de render** (sua máquina? um servidor?) — aí eu monto a Rodada 3.
5. ☐ (Opcional) setar `LOVABLE_API_KEY` pra IA real.
