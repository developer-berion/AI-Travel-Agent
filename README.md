# Alana AI Travel Quoting OS

Engineering OS para el quoting workspace de Alana. Este repo es la baseline de implementacion que siembra el repo remoto y ejecuta el flujo `workflow-first` aprobado por PMOS.

## Stack baseline

- `pnpm + Turborepo`
- `Next.js 15 App Router`
- `React 19`
- `TypeScript strict`
- `Biome`
- `Vitest`
- `Playwright`
- `Supabase` para `Auth + Postgres + Storage`
- `Vercel` para deploy web
- `GitHub Actions` para validacion
- `OpenAI Responses API` con `gpt-5-mini` como default cuando `AI_PROVIDER=openai`

## Estructura

- `apps/web`: workbench operator-facing y BFF con `Route Handlers`
- `apps/pdf-renderer`: reservado para el renderer Node-only del PDF
- `packages/domain`: contratos, comandos y state machine
- `packages/database`: mock repository y `SupabaseQuoteRepository`
- `packages/orchestration`: prompt registry, runtime AI y command runner
- `packages/hotelbeds`: frontera tipada del proveedor
- `packages/evals`: baseline de evaluacion
- `packages/shared`: utilidades compartidas
- `supabase`: migraciones y assets de plataforma

## Runtime modes

- `AUTH_MODE=mock|supabase`
- `QUOTE_REPOSITORY_MODE=mock|supabase`
- `AI_PROVIDER=mock|openai`

Defaults locales:

- `mock auth`
- `mock repository`
- `mock orchestration`

Los modos reales se activan solo cuando existen env vars validas. `Notion` queda fuera del runtime y se usa solo para tracking.

## Variables de entorno

Usa `.env.example` como contrato base.

Variables importantes:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son la forma preferida para web
- `SUPABASE_URL` y `SUPABASE_ANON_KEY` se mantienen como compatibilidad
- `SUPABASE_SERVICE_ROLE_KEY` habilita upsert de perfiles y persistencia admin
- `OPENAI_MODEL` default `gpt-5-mini`
- `OPENAI_REASONING_INTAKE=minimal`
- `OPENAI_REASONING_ROUTING=low`
- `OPENAI_REASONING_PACKAGING=medium`

## Quickstart

```bash
pnpm install
pnpm dev
```

La app arranca en `mock` y permite:

- login local
- crear y retomar quotes
- intake y clarificacion
- shortlists mock
- archivado
- tema `light/dark` con persistencia local

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Calidad y CI

El pipeline base corre en `GitHub Actions` sobre Linux y valida:

- lint
- typecheck
- unit tests
- build
- Playwright smoke E2E

`Vercel Hobby` y `Supabase Free` se aceptan solo hasta piloto interno. Antes de piloto real se eleva el gate minimo a `Vercel Pro` y Supabase con backups/PITR.
