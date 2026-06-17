# Migrations

Reconciliado com a produção (`nkxfoibhbfxyfgdnlycb`).

- `20260617231015_episodes_storage_bucket.sql` — bucket de Storage dos MP4 (criado aqui).
- As 4 migrations anteriores do schema do produto (vap_studio_init, vap_scheduled_posts_and_tokens,
  vap_product_schema, vap_oauth_state_tokens) vivem na produção. Materialize-as byte-exato com:

      supabase link --project-ref nkxfoibhbfxyfgdnlycb
      supabase db pull

As migrations antigas do sandbox Lovable estão em `../_archive_sandbox_migrations/`.
