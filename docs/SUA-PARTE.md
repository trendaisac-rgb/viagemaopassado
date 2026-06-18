# Sua parte, Doug — passo a passo pra conectar (e ver funcionando)

Tudo no portal já está pronto. Falta **só** uma coisa que só você pode fazer: **criar o app de desenvolvedor** de cada rede (uma vez) e **colar as chaves no portal**. Igual o Buffer/Real Oficial fizeram com o app deles. Depois é só clicar **Conectar → autorizar**.

> Onde colar as chaves: no VaP Studio → **Conexões → Configurar apps**. Não precisa mais mexer no Supabase.

**Callback / Redirect URI (cola igualzinho em TODOS os apps):**
```
https://nkxfoibhbfxyfgdnlycb.supabase.co/functions/v1/social-oauth-callback
```

---

## 🥇 Comece pelo YouTube (grátis, ~10 min — pra você VER funcionando hoje)

1. Abra **console.cloud.google.com** → crie um projeto (ex.: "VaP Studio").
2. **APIs e Serviços → Biblioteca** → procure **YouTube Data API v3** → **Ativar**.
3. **APIs e Serviços → Tela de permissão OAuth**:
   - Tipo: **Externo** → preencha nome do app, e-mail de suporte e contato.
   - **Usuários de teste** → adicione o **e-mail da conta do canal** (sem isso, o login é bloqueado enquanto o app não é verificado).
4. **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**.
   - **URIs de redirecionamento autorizados** → cole o **Callback** acima (exato).
   - Salve e copie o **Client ID** e o **Client Secret**.
5. No portal: **Conexões → Configurar apps → YouTube** → cole Client ID + Secret → **Salvar chaves**.
6. Clique **Conectar** no card do YouTube → escolha a conta do canal → autorize. ✅

> Se der erro, ele aparece na tela (toast / `?error=`). Me manda o texto que eu corrijo.

---

## 🥈 X (Twitter) — funciona já, mas é pago

1. **developer.x.com** → vire desenvolvedor → crie **Project + App**.
2. No App → **User authentication settings → Set up**:
   - App permissions: **Read and write**.
   - Type: **Web App**.
   - **Callback URI**: cole o Callback acima.
3. **Keys and tokens** → copie **OAuth 2.0 Client ID** e **Client Secret**.
4. Portal → Configurar apps → **X** → cola → Salvar → **Conectar**.

> Custo: a X virou **pay-per-use** (~US$0,015/post). Já deixei o **vídeo nativo** pronto (upload chunked). Se já tinha conectado antes, **reconecte** (adicionei a permissão de mídia).

---

## 🥉 Instagram e TikTok — exigem revisão (semanas) OU o atalho

O fluxo no portal já está pronto, mas **publicar** exige aprovação:
- **Instagram**: conta **Business/Creator** + app na Meta + **App Review** (`instagram_business_content_publish`), ~2–4 semanas.
- **TikTok**: app + **auditoria** da Content Posting API, ~2–4 semanas (antes disso, posts ficam privados).

### ⚡ O atalho real (se quiser IG/TikTok sem esperar revisão)
Plugar **Ayrshare** — eles já são o parceiro aprovado das 4 redes; você cria 1 conta, pega 1 API key, e posta em tudo (incl. IG/TikTok) sem fazer as revisões. Custa a partir de ~US$149/mês. **Me avise** que eu ligo isso no portal (function `unified-publish`) — aí sua parte vira "colar 1 chave".

---

## Resumo da sua parte
- ☐ **Hoje:** criar app do **YouTube** + colar chaves no portal → conectar (grátis, rápido, pra ver funcionando).
- ☐ Criar app do **X** se quiser (pago).
- ☐ Decidir IG/TikTok: **revisão própria** (semanas) **ou** **Ayrshare** (pago, na hora).
- ☐ (Pra postar de verdade) ter um **MP4 renderizado** — ver o NIGHT-LOG sobre o worker de render.
