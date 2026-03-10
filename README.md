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
- `HOTELBEDS_PROVIDER=mock|hotelbeds`

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
- `HOTELBEDS_BASE_URL` default `https://api.test.hotelbeds.com`
- `HOTELBEDS_DEFAULT_LANGUAGE` default `en`
- `HOTELBEDS_HOTELS_*`, `HOTELBEDS_ACTIVITIES_*` y `HOTELBEDS_TRANSFERS_*` separan credenciales por suite

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
pnpm hotelbeds:verify
pnpm staging:hotelbeds:smoke
```

## Calidad y CI

El pipeline base corre en `GitHub Actions` sobre Linux y valida:

- lint
- typecheck
- unit tests
- build
- Playwright smoke E2E

`Vercel Hobby` y `Supabase Free` se aceptan solo hasta piloto interno. Antes de piloto real se eleva el gate minimo a `Vercel Pro` y Supabase con backups/PITR.

## Hotelbeds staging baseline

Metodos fijados desde documentacion oficial:

- `Hotels Booking API`: `POST /hotel-api/1.0/hotels` para disponibilidad real; `POST /hotel-api/1.0/checkrates` solo cuando el proveedor obliga a revalidar.
- `Activities Booking API`: `POST /activity-api/3.0/activities` para search/availability.
- `Transfers Booking API`: `GET /transfer-api/1.0/availability/...` para disponibilidad simple; `availability-multi` queda para itinerarios o rutas multiples.
- `Content API` y `Cache API` no son la verdad transaccional del quote; se reservan para enrichment y mapping.

Estado actual:

- El paquete `@alana/hotelbeds` ya soporta firma `Api-key + X-Signature`, config por suite y adapter real cuando el intake trae anchors supplier-ready.
- El intake ahora conserva contexto entre aclaraciones y resuelve un baseline curado de anchors supplier-ready para destinos soportados.
- Hotel y actividades ya pueden mapear destinos conocidos (`Barcelona`, `Madrid`, `Paris`, `Rome`, `Cancun`, `Miami`, `London`, `Majorca`) cuando `HOTELBEDS_PROVIDER=hotelbeds`.
- Transfers ya no intenta buscar a ciegas: solo se habilita con pickup/dropoff exactos; si falta un extremo, la cotizacion queda parcial y vuelve a `clarifying`.
- El runtime hosted ya opera en `HOTELBEDS_PROVIDER=hotelbeds` para los casos supplier-ready soportados.
- `pnpm hotelbeds:verify` valida credenciales y conectividad real de sandbox por suite sin persistir secretos en el repo.
- `pnpm staging:hotelbeds:smoke` ejecuta un smoke hosted contra `https://alana-ai-agent.vercel.app` usando un usuario temporal de `Supabase Auth`.

## Staging hosted

Estado activado el `2026-03-09`:

- GitHub canonico: `developer-berion/AI-Travel-Agent`
- Supabase staging: `uaqzreazqxhseyriulbt`
- Vercel staging: `alana-ai-agent`
- URL canonica actual: `https://alana-ai-agent.vercel.app`

Lo que ya quedo activo:

- `AUTH_MODE=supabase` en hosted
- `QUOTE_REPOSITORY_MODE=supabase` en hosted
- `AI_PROVIDER=openai` en hosted
- `HOTELBEDS_PROVIDER=hotelbeds` en hosted desde `2026-03-10`
- repo GitHub ahora `public`
- `main` protegida con `PR` + checks `lint`, `typecheck`, `test`, `build`, `test:e2e`
- `Supabase Auth` en modo `invite-only`
- `site_url` y redirects de auth alineados al staging actual
- primer admin invitado a `victor@alanatours.com`
- deploy manual exitoso del workbench actual a `https://alana-ai-agent.vercel.app`
- validacion real de `OpenAI Responses API` con `gpt-5-mini`, dejando `openai_response_id` persistido en `audit_events`
- validacion real de credenciales `Hotelbeds test` en `hotels`, `activities` y `transfers` usando requests oficiales de sandbox
- smoke hosted supplier-backed exitoso para:
  - `hotel_only`
  - `activity_only`
  - `transfer_only`
  - `partial_transfer_blocked`

Notas operativas vigentes:

- GitHub queda publico por decision de plan gratuito.
- `Vercel for Git` ya esta conectado al repo `developer-berion/AI-Travel-Agent`.
- `Require Verified Commits` esta habilitado en Vercel; los commits locales sin firma verificada disparan el webhook Git pero el preview queda cancelado antes de build.
- El camino verificado para release sigue siendo:
  - preview por PR/branch con commits verificados
  - merge a `main` via PR
  - `manual deploy + smoke` como fallback operativo si la firma verificada no esta disponible desde el entorno local
