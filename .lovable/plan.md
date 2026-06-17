
# Cockpit "Viagem ao Passado" — Plano de Construção

App interno de operação de conteúdo, escuro e cinematográfico (Linear/Vercel/ElevenLabs vibe), em pt-BR.

## Stack & Fundações
- TanStack Start + React + Tailwind v4 + shadcn/ui (já no template).
- **Lovable Cloud** habilitado (auth e-mail/senha + Google, banco, storage, edge functions, RLS).
- Fontes: Anton, Oswald, Inter via `<link>` no `__root.tsx`.
- Design system em `src/styles.css` com tokens semânticos (sem cores hardcoded em componentes):
  - `--background #070A12`, `--panel #111A2B`, `--border #22304A`
  - `--primary` dourado `#E9B84A`, `--primary-hover #FFD56A`
  - `--ice #7FB2FF`, `--blood #B11D24`, `--success #39C07A`
  - `--foreground #F3F1EC`, `--muted-foreground #8090A8`
  - Gradiente radial azul-petróleo no topo, sombras suaves, radius 16px.
- Logo SVG inline (bússola circular + flechas em X dourado + ponto central).

## Fase 1 — Auth + Shell (esta entrega)
1. Habilitar Lovable Cloud.
2. Migração inicial: enum `app_role`, tabela `user_roles` + `has_role`, tabela `profiles`, trigger `handle_new_user`, todas as tabelas do app (abaixo) + RLS + GRANTs.
3. Auth page (`/auth`): e-mail/senha + Google (via `lovable.auth.signInWithOAuth`), com configuração via `supabase--configure_social_auth`.
4. Layout protegido (`_authenticated/route.tsx` gerenciado): sidebar fixa + topbar + outlet.
5. Sidebar com logo, 8 itens (Painel, Estúdio, Episódios, Agenda, Comentários, Análises, Conexões, Ajustes), rodapé com avatar/e-mail/sair.
6. **Painel** completo: KPIs Anton, gráfico recharts 30d, próximas publicações, últimos episódios, CTA "Novo episódio".
7. **Estúdio** stepper (a–f): tema→ângulos, roteiro+fact-check, legenda/hashtags, voz/estilo, geração (job assíncrono com progresso simulado via realtime/polling), resultado + publicar/agendar.
8. Edge Function `ai-generate` (sugestões/roteiro/legenda) usando **Lovable AI Gateway** (`google/gemini-3-flash-preview`) — sem necessidade de chave manual.
9. Seed: 4–6 episódios + métricas + posts agendados + comentários demo (via migração).

## Fase 2 — Episódios, Agenda, Comentários
- Grade/lista com filtros, drawer detalhado.
- Calendário (semana/mês) com drag-to-reschedule.
- Inbox unificada com filtro rede/sentimento.

## Fase 3 — Análises, Conexões, Ajustes
- Tabelas ordenáveis + gráficos por rede.
- 4 cards de conexão (status mock, OAuth placeholders com notas).
- Ajustes de marca/voz/padrões.

## Schema (Supabase)

```text
profiles(id PK→auth.users, email, full_name, avatar_url, brand_name, brand_voice, defaults_json, created_at)
user_roles(id, user_id, role app_role) + has_role()
episodes(id, user_id, title, topic, angle, script, caption, hashtags[], voice, duration_s,
         aspect '9:16', status[draft|generating|ready|published|failed], video_url, thumb_url,
         progress_step, progress_pct, created_at, updated_at)
networks(id, user_id, network[x|youtube|instagram|tiktok], handle, status[connected|disconnected|pending], token_ref, connected_at)
scheduled_posts(id, user_id, episode_id, network, scheduled_at, status[scheduled|publishing|published|failed], external_id, created_at)
metrics(id, user_id, episode_id, network, date, views, likes, comments, shares, retention_pct)
comments(id, user_id, episode_id, network, author, body, sentiment[pos|neu|neg], replied bool, post_url, created_at)
ai_jobs(id, user_id, episode_id, kind[angles|script|caption|render], status, input_json, output_json, error, created_at)
```

Todas com RLS `user_id = auth.uid()` + GRANTs `authenticated` + `service_role`.

## Componentes-chave
`Logo`, `Sidebar`, `Topbar`, `KpiCard`, `TrendChart`, `EpisodeCard` (9:16), `NetworkBadge`, `StatusPill`, `Stepper`, `ProgressTimeline`, `EmptyState`, skeletons.

## Notas
- Render real de vídeo fica como job (status no banco) — worker externo não incluso; UI simula progressão realista.
- IA via Lovable AI Gateway (sem chave manual); fallback mock se 402/429.
- OAuth real das redes: placeholders com notas (YouTube/X diretos, IG Business + revisão Meta, TikTok auditoria).
- Tudo em pt-BR, contraste AA, microanimações.

Começo pela Fase 1 nesta primeira entrega (já é grande). Confirma o plano que eu sigo?
