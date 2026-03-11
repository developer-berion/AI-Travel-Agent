# Staging Sync Runbook

## Objetivo

Mantener repo y staging alineados al mismo release candidate verificable.

Una release solo cuenta como sincronizada cuando:

- el SHA desplegado coincide con el release candidate local
- `migrationHead` coincide con la ultima migracion requerida del repo
- `AUTH_MODE`, `QUOTE_REPOSITORY_MODE`, `AI_PROVIDER`, `HOTELBEDS_PROVIDER` y `QUOTE_EXPORTS_BUCKET` coinciden con el contrato runtime
- `pnpm staging:hotelbeds:smoke` y `pnpm staging:bundle:smoke` pasan contra ese mismo payload de `/api/runtime-sync`

## Canonicales actuales

- GitHub repo: `developer-berion/AI-Travel-Agent`
- Supabase staging project: `uaqzreazqxhseyriulbt`
- Vercel staging project: `alana-ai-agent`
- Required migration head: `20260310163000_quote_exports_storage.sql`
- Required storage bucket: `quote-exports`

## Env contract minimo

- `AUTH_MODE=supabase`
- `QUOTE_REPOSITORY_MODE=supabase`
- `AI_PROVIDER=openai`
- `HOTELBEDS_PROVIDER=hotelbeds`
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
- `QUOTE_EXPORTS_BUCKET=quote-exports`
- `ALANA_RUNTIME_GIT_SHA`
- `ALANA_RUNTIME_BUILD_AT`
- `ALANA_RUNTIME_MIGRATION_HEAD`

## Procedimiento de sincronizacion

1. Confirmar que el release candidate local tiene gates verdes: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
2. Confirmar el SHA candidato y el migration head local.
3. Aplicar migraciones remotas hasta `20260310163000_quote_exports_storage.sql`.
4. Verificar o crear el bucket privado `quote-exports`.
5. Alinear variables de staging con el contrato runtime y publicar `ALANA_RUNTIME_GIT_SHA`, `ALANA_RUNTIME_BUILD_AT` y `ALANA_RUNTIME_MIGRATION_HEAD`.
6. Desplegar staging desde ese mismo SHA.
7. Verificar `GET /api/runtime-sync`.
8. Ejecutar `pnpm staging:hotelbeds:smoke`.
9. Ejecutar `pnpm staging:bundle:smoke`.
10. Registrar el resultado en esta tabla.

## Registro operativo

| Fecha | SHA | Migration Head | Supabase Project | Vercel Project | Runtime Sync | Hotelbeds Smoke | Bundle Smoke | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | `20260310163000_quote_exports_storage.sql` | `uaqzreazqxhseyriulbt` | `alana-ai-agent` | Pending | Pending | Pending | Completar tras el siguiente deploy sincronizado |
