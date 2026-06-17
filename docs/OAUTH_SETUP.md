# Conectar as redes sociais do Viagem ao Passado — Guia de OAuth

_Atualizado em 17/06/2026 com base nas docs oficiais. Para: Doug._

Este guia liga a tela **Conexões** do VaP Studio às contas reais. As edge functions já estão no ar
(`social-oauth-start`, `social-oauth-callback`); o que falta é **só o que apenas você (dono das contas) pode fazer**:
criar os apps de desenvolvedor e colar os IDs/segredos nos secrets do Supabase.

> ⚠️ **Nunca cole client secrets nem tokens no chat.** Configure tudo direto no painel do Supabase / nos portais.
> (O token do GitHub que você colou antes deve ser revogado.)

---

## Dados fixos deste projeto (você vai reusar em todos)

| Item | Valor |
|---|---|
| Supabase project | `nkxfoibhbfxyfgdnlycb` |
| **Redirect/Callback URL** (cola em TODOS os apps) | `https://nkxfoibhbfxyfgdnlycb.supabase.co/functions/v1/social-oauth-callback` |
| App URL (pra onde o usuário volta) | a URL pública do Studio (ex.: domínio Lovable ou custom) |

**Onde colar os secrets:** Supabase → projeto → **Edge Functions → Secrets** (ou via CLI
`supabase secrets set NOME=valor --project-ref nkxfoibhbfxyfgdnlycb`).
Os `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já são injetados automaticamente — **não precisa setar**.

Secret global necessário para o retorno funcionar:

```
APP_URL = https://SEU-DOMINIO-DO-STUDIO   (sem barra no final)
```

---

## Status de cada rede (leia antes de investir tempo)

| Rede | Custo | Esforço | Já implementado no código? |
|---|---|---|---|
| **YouTube** | **Grátis** | Baixo (1 app no Google Cloud) | ✅ Sim (start + callback) — **comece por aqui** |
| **X (Twitter)** | **Pago** (pay-per-use ~US$0,015/post) | Médio | ✅ OAuth pronto; ⚠️ postar vídeo exige fluxo extra |
| **Instagram** | Grátis (API), mas exige revisão | Alto (conta Business + App Review Meta) | ⛔ Stub ("em breve") |
| **TikTok** | Grátis, mas exige auditoria | Alto (audit do app) | ⛔ Stub ("em breve") |

---

## 1) YouTube — comece por aqui (grátis)

1. Acesse o **Google Cloud Console** → crie/seleciona um projeto.
2. **APIs & Services → Library →** habilite a **YouTube Data API v3**.
3. **APIs & Services → OAuth consent screen:**
   - User type **External**; preencha nome do app, e-mail de suporte e contato.
   - Em **Scopes**, adicione: `.../auth/youtube.upload` e `.../auth/youtube.readonly`.
   - Em **Test users**, adicione o **e-mail da conta do canal** (enquanto o app não for verificado, só test users conseguem autorizar).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - Application type: **Web application**.
   - **Authorized redirect URIs:** cole exatamente
     `https://nkxfoibhbfxyfgdnlycb.supabase.co/functions/v1/social-oauth-callback`
   - Salve e copie **Client ID** e **Client secret**.
5. No Supabase, defina os secrets:
   ```
   YOUTUBE_CLIENT_ID = <client id>
   YOUTUBE_CLIENT_SECRET = <client secret>
   ```
6. Abra **Conexões → YouTube → Conectar**, escolha a conta do canal, aceite. Pronto: a função grava o token em `social_tokens` e marca a rede como conectada.

> ⚠️ **App não verificado:** funciona para test users, mas vídeos enviados ficam **privados** até o app passar pela verificação do Google (necessária para `youtube.upload` em produção). Para o lançamento público, envie o app para verificação (pode levar dias/semanas).
> 💡 Cota: upload custa **1600 unidades**; o padrão é **10.000/dia** (≈6 uploads/dia) — suficiente para o canal.

---

## 2) X / Twitter — OAuth pronto, mas agora é pago

> 💰 **Mudança importante (fev/2026):** a X **acabou com o tier grátis** para novos desenvolvedores. O padrão agora é **pay-per-use: ~US$0,015 por post** (post com link custa bem mais), leituras US$0,005. Não há mais "Free". Avalie se vale antes de configurar.

1. **developer.x.com** → vire desenvolvedor → crie um **Project** e um **App** dentro dele.
2. No App → **User authentication settings → Set up:**
   - **App permissions:** Read and write.
   - **Type of App:** **Web App** (confidential client).
   - **Callback URI:** `https://nkxfoibhbfxyfgdnlycb.supabase.co/functions/v1/social-oauth-callback`
   - **Website URL:** a URL do Studio.
3. Em **Keys and tokens**, copie o **OAuth 2.0 Client ID** e **Client Secret**.
4. No Supabase, defina:
   ```
   X_CLIENT_ID = <client id>
   X_CLIENT_SECRET = <client secret>
   ```
5. **Conexões → X → Conectar.** O fluxo usa OAuth 2.0 **PKCE** com escopos `tweet.read tweet.write users.read offline.access` (já no código).

> ⚠️ A função atual autentica e guarda o token (suficiente para postar **texto**). **Upload de vídeo** na X usa o endpoint de mídia (fluxo chunked, historicamente v1.1/OAuth1) — **ainda não implementado**; precisa de uma função `x-publish` dedicada.

---

## 3) Instagram — só quando o resto estiver rodando (alto esforço)

Requisitos (Meta):
- Conta **Instagram Business ou Creator** vinculada a uma **Página do Facebook**.
- App na **Meta for Developers** com as permissões **`instagram_business_basic`** e **`instagram_business_content_publish`** (nomes novos desde jan/2025).
- **App Review** com screencast do fluxo completo — **2–4 semanas** de análise.

Limites: publicação pela API segue o **modelo de container** (cria → processa → publica), teto de **100 posts/24h**, e **Reels via API ficam limitados a ~90s** (o app nativo aceita mais, a Graph API não).

> ⚠️ Atenção ao limite de 90s: o EP008 (Mincemeat) tem 1min49 — **não publicaria como Reel via API**. Cortes ≤90s passam.

No código: hoje retorna "Instagram/TikTok exigem aprovação da plataforma — em breve". Implementar depois da aprovação.

## 4) TikTok — exige auditoria (alto esforço)

- App na **TikTok for Developers** com a **Content Posting API** e escopo **`video.publish`**.
- **Auditoria obrigatória** do app (2–4 semanas). **Antes de aprovar:** todo post é **SELF_ONLY** (só o criador vê), máx **5 usuários/24h**.
- Regras que a auditoria verifica: mostrar **username + avatar do criador** antes de postar, deixar o criador **escolher a privacidade**, e **não** adicionar marca d'água/logo/texto via app.

No código: stub "em breve". Implementar depois da auditoria.

---

## Checklist do Doug (ordem recomendada)

1. ☐ Supabase → **Authentication → habilitar Anonymous sign-ins** (faz o "sem login" do Studio funcionar).
2. ☐ Definir `APP_URL` nos secrets do Supabase.
3. ☐ **YouTube:** criar app no Google Cloud + setar `YOUTUBE_CLIENT_ID/SECRET` → conectar.
4. ☐ (Se valer o custo) **X:** criar app + setar `X_CLIENT_ID/SECRET` → conectar.
5. ☐ Testar o ciclo conectar/desconectar em **Conexões**.
6. ☐ Instagram/TikTok: iniciar os processos de review/audit (demoram semanas) só quando priorizar.

## Próximo passo de engenharia (eu faço)
Depois que o YouTube conectar, falta o elo **publicar de verdade**: função `youtube-publish` (upload resumable) que lê o `social_tokens`, pega o `episode.video_url` e sobe o Short. Isso depende também do bridge **render Remotion → Supabase Storage → `episode.video_url`**.

---

### Fontes oficiais
- YouTube Data API — OAuth 2.0 (web server): https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
- X API — OAuth 2.0 Authorization Code + PKCE: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
- Instagram — Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- TikTok — Content Posting API (Direct Post): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
