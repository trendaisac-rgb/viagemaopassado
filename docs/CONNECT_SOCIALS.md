# Conectar as redes no VaP Studio — como funciona e o que falta

_Para o Doug. Escrito durante o trabalho noturno de 17→18/06/2026._

## A verdade sobre o "conectar fácil" (Buffer/mLabs/realoficial)

Aquele fluxo mágico de "clico em conectar → autorizo → já posta" **é OAuth de app aprovado**. A própria Buffer diz, com todas as letras, que é "**official API partner** with Instagram, TikTok, YouTube, X". O que é fácil pra você (clicar e autorizar) só é fácil porque a ferramenta fez a parte difícil **uma vez**: registrou um app de desenvolvedor em cada plataforma e — no caso de **Instagram e TikTok** — passou pela **revisão/auditoria** da plataforma. **Não existe API secreta que pule isso.**

Para o **nosso** portal fazer igual, há dois caminhos honestos:

1. **Ser o nosso próprio app aprovado** (foi o que construí). Você cria os apps de dev e, pra IG/TikTok, passa pela revisão. Aí o VaP Studio tem o mesmo "clica e autoriza", com a sua marca. **YouTube e X não precisam de revisão** (YouTube grátis; X é pago).
2. **Usar uma API unificada** (ex.: **Ayrshare**) — eles já são o parceiro aprovado; você chama uma API só e eles postam no IG/TikTok/YT/X. É o atalho real pra IG/TikTok **sem você fazer as revisões**. Custa a partir de ~US$149/mês. (Mixpost/Postiz, open-source, **não** pulam a revisão — só dão a interface; você ainda registra seus apps.)

> Resumo: o "fácil" do usuário final = OAuth de parceiro aprovado. Pra IG/TikTok rápido sem burocracia, o caminho é uma API unificada. Pra X/YouTube, dá pra ter agora com os seus próprios apps.

---

## O que JÁ está construído e no ar (8 edge functions)

`ai-generate` · `bootstrap-portal` · `social-oauth-start` · `social-oauth-callback` · `youtube-publish` · `x-publish` · `instagram-publish` · `tiktok-publish`.

**O fluxo de conexão (igual Buffer) já está pronto pras 4 redes:** em **Conexões**, clicar em **Conectar** numa rede chama `social-oauth-start`, que abre a tela de autorização da plataforma. Você autoriza, volta pro app em `/conexoes?connected=<rede>`, o token é salvo (tabela `social_tokens`, só service-role acessa) e a rede aparece **Conectado**. O `social-oauth-callback` faz a troca do code por token pras 4 redes.

**Publicar:** no **Estúdio** ("Publicar agora") e em **Episódios** ("Publicar nas conectadas"), o app chama a função certa por rede. Cada função baixa o MP4 do Storage e publica.

---

## O que SÓ VOCÊ pode fazer (criar apps + secrets) — por rede

**Redirect/Callback (cola em TODAS):**
`https://nkxfoibhbfxyfgdnlycb.supabase.co/functions/v1/social-oauth-callback`

**Secrets ficam em:** Supabase → Edge Functions → Secrets. Também defina `APP_URL = https://SEU-DOMINIO` (pra onde o usuário volta).

### 1. YouTube — grátis, comece aqui
- Google Cloud → habilitar **YouTube Data API v3** → tela de consentimento (scopes `youtube.upload`, `youtube.readonly`, adicione seu e-mail como test user) → criar **OAuth client (Web)** com o redirect acima.
- Secrets: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`.
- ⚠️ App não verificado sobe vídeo como **privado** até a verificação do Google.

### 2. X (Twitter) — pago, já com vídeo
- developer.x.com → Project + App → User authentication settings → **Web App** → callback acima → scopes (já no código): `tweet.write users.read media.write offline.access`.
- Secrets: `X_CLIENT_ID`, `X_CLIENT_SECRET`.
- ⚠️ X é **pay-per-use** (~US$0,015/post). **Upload de vídeo nativo já implementado** (chunked). Como adicionei o escopo `media.write`, conecte com o consentimento novo.

### 3. Instagram — precisa de conta Business + revisão Meta
- Meta for Developers → app com **Instagram** → produto "Instagram API" (Instagram Business Login) → redirect acima → permissões `instagram_business_basic`, `instagram_business_content_publish`.
- Conta IG precisa ser **Business/Creator**. **App Review da Meta** (2–4 semanas) pra liberar publicação.
- Secrets: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`.
- ⚠️ Reels via API: **≤90s** (cortes curtos passam; o Mincemeat de 1:49 não). O `instagram-publish` gera uma URL assinada do vídeo (bucket privado) e usa o modelo de container (cria → processa → publica).

### 4. TikTok — precisa de auditoria
- TikTok for Developers → app → produto **Content Posting API** → redirect acima → scopes `user.info.basic`, `video.publish`.
- **Auditoria do app** (2–4 semanas). Antes dela, todo post é **privado (SELF_ONLY)** e no máx 5 usuários/dia.
- Secrets: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.
- O `tiktok-publish` usa **FILE_UPLOAD** (sobe o arquivo direto, sem precisar verificar domínio) e respeita a privacidade permitida pela conta.

---

## Pré-requisito comum: o vídeo precisa existir
Publicar exige um **MP4 renderizado no Storage** (`episodes/{user_id}/{episode_id}.mp4`), feito pelo pipeline Remotion + `scripts/upload-render.mjs` (ver `docs/PUBLISH_PIPELINE.md`). Sem isso, as funções de publish respondem com erro claro ("episódio sem vídeo"). O X consegue postar **texto** sem vídeo.

## O atalho (se quiser IG/TikTok sem esperar revisão)
Plugar **Ayrshare** (ou similar). Eles são o parceiro aprovado; integramos **uma** API e postamos nas 4 (incl. IG/TikTok) sem você fazer Meta App Review nem auditoria TikTok. Posso escrever uma função `social-unified-publish` que só precisa da sua **API key** da Ayrshare — me avise que eu ligo.

---

## Checklist do Doug (ordem)
1. ☐ Supabase → Authentication → habilitar **Anonymous sign-ins** (ou deixar o login-portal automático que já fiz).
2. ☐ Definir `APP_URL`.
3. ☐ **YouTube**: app + `YOUTUBE_CLIENT_ID/SECRET` → conectar (grátis, rápido).
4. ☐ **X**: app + `X_CLIENT_ID/SECRET` → conectar (pago).
5. ☐ **Instagram**: app + secrets → **iniciar App Review da Meta** (semanas).
6. ☐ **TikTok**: app + secrets → **iniciar auditoria** (semanas).
7. ☐ Decidir: esperar as revisões **ou** plugar Ayrshare pra IG/TikTok já.

### Fontes
- Buffer é parceiro oficial de API: https://buffer.com/made-for/developers
- Ayrshare (API unificada): https://www.ayrshare.com/ · https://github.com/ayrshare/social-media-api
- Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- TikTok Content Posting (Direct Post): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- YouTube Data API OAuth: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
- X OAuth 2.0 + media: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
