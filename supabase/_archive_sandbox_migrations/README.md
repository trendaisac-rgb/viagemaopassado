# Migrations arquivadas (linhagem antiga do sandbox Lovable)

Estas 3 migrations foram geradas numa versão anterior do projeto (sandbox Lovable) e
**nunca foram aplicadas** ao banco de produção `nkxfoibhbfxyfgdnlycb`. Foram movidas pra cá
para não conflitar com o histórico real do `supabase db push`.

O banco de produção foi construído por uma linhagem própria (4 migrations):

- 20260617182825  vap_studio_init
- 20260617183515  vap_scheduled_posts_and_tokens
- 20260617195444  vap_product_schema      (schema final do produto, SEM seed demo)
- 20260617201839  vap_oauth_state_tokens  (tabelas oauth_state + social_tokens)

## Como materializar as migrations reais no repo (byte-exato)
No Mac, com a Supabase CLI logada e o projeto linkado:

    supabase link --project-ref nkxfoibhbfxyfgdnlycb
    supabase db pull            # gera supabase/migrations/*.sql idênticas à produção
    supabase functions download ai-generate social-oauth-start social-oauth-callback

Isso é o jeito canônico de reconciliar (a sandbox aqui não tem a senha do banco).
