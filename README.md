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
- `apps/pdf-renderer`: renderer Node-only del PDF exportable
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
- `QUOTE_EXPORTS_BUCKET` define el bucket privado para artefactos PDF de quote export
- `ALANA_RUNTIME_GIT_SHA`, `ALANA_RUNTIME_BUILD_AT` y `ALANA_RUNTIME_MIGRATION_HEAD` permiten exponer el release candidate real via `GET /api/runtime-sync`
- `RELEASE_CANDIDATE_GIT_SHA` y `RELEASE_CANDIDATE_MIGRATION_HEAD` permiten que los smokes hosted aborten si staging no coincide con el SHA y migration head esperados
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
pnpm check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm hotelbeds:verify
pnpm staging:hotelbeds:smoke
pnpm staging:bundle:smoke
```

## Release candidate workflow

Release gate local obligatorio antes de tocar git:

```bash
pnpm check
pnpm build
pnpm --filter @alana/web test:e2e e2e/workspace-smoke.spec.ts
```

Release gate hosted obligatorio antes de promover a `main`:

1. actualizar `ALANA_RUNTIME_GIT_SHA`, `ALANA_RUNTIME_BUILD_AT` y `ALANA_RUNTIME_MIGRATION_HEAD` en Vercel para el candidato exacto
2. desplegar manualmente el commit candidato al proyecto staging `alana-ai-agent`
3. verificar `GET /api/runtime-sync`
4. exportar localmente:

```bash
$env:RELEASE_CANDIDATE_GIT_SHA="<sha>"
$env:RELEASE_CANDIDATE_MIGRATION_HEAD="<migration_head>"
```

5. ejecutar:

```bash
pnpm staging:hotelbeds:smoke
pnpm staging:bundle:smoke
```

La promocion a `main` solo avanza con:

- CI verde
- `runtime-sync` alineado al candidato
- smokes hosted verdes
- checklist de staging cerrada

## Runtime sync

- `GET /api/runtime-sync` expone `gitSha`, `builtAt`, `appVersion`, `migrationHead`, `AUTH_MODE`, `QUOTE_REPOSITORY_MODE`, `AI_PROVIDER`, `HOTELBEDS_PROVIDER` y `QUOTE_EXPORTS_BUCKET`
- `pnpm staging:hotelbeds:smoke` y `pnpm staging:bundle:smoke` validan ese payload antes de crear usuarios temporales o ejecutar comandos
- cualquier validacion hosted previa deja de ser considerada vigente si `/api/runtime-sync` no coincide con el release candidate local

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
- `ai-runtime` y `anchor-resolution` comparten el mismo registry de destinos soportados para evitar drift entre extraccion y supplier readiness.
- La seleccion operator-facing del quote ya se persiste como snapshot supplier-backed en `selected_quote_items`, sin acoplar la UI a payloads raw del proveedor.
- `select_option_for_cart`, `remove_cart_item` y `refresh_bundle_review` ya actualizan `bundleReview`, version activa y readiness de export dentro del command layer.
- La seleccion supplier-backed de hotel ahora puede hidratar `transferProperty*`, re-ejecutar la shortlist dependiente de `transfer` y mantener el bundle bloqueado hasta cerrar todos los servicios pedidos.
- `generate_quote_pdf` ya crea un snapshot inmutable en `quote_context_snapshots`, renderiza un PDF binario real, persiste metadata en `quote_exports` y escribe el artefacto en `Supabase Storage` cuando `QUOTE_REPOSITORY_MODE=supabase`.
- El export ya se expone con lectura metadata+snapshot en `GET /api/quote-sessions/[quoteSessionId]/exports/[exportId]` y descarga binaria en `GET /api/quote-sessions/[quoteSessionId]/exports/[exportId]/pdf`.
- `GET /api/runtime-sync` ya publica el contrato minimo de sincronizacion repo-versus-staging y fuerza a que los smokes hosted fallen por drift antes de ejecutar escenarios.
- Hotel y actividades ya pueden mapear destinos conocidos (`Barcelona`, `Madrid`, `Paris`, `Rome`, `Cancun`, `Miami`, `London`, `Majorca`) cuando `HOTELBEDS_PROVIDER=hotelbeds`.
- Transfers ya no intenta buscar a ciegas: solo se habilita con pickup/dropoff exactos; si falta un extremo, la cotizacion queda parcial y vuelve a `clarifying`.
- Transfers tambien puede reutilizar anchors ya estructurados (`transferFrom*`, `transferTo*`, `transferProperty*`) cuando el hilo ya conoce una propiedad exacta aunque el operador la mencione de forma generica como `the hotel`.
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
- smoke hosted exitoso para `bundle review`:
  - `reviewing -> export_ready` via `select_option_for_cart`
  - `export_ready -> reviewing` via `remove_cart_item`
- smoke mock/E2E exitoso para export PDF real:
  - `export_ready -> exported` via `generate_quote_pdf`
  - navegacion a `/quotes/[quoteSessionId]/export/[exportId]`
  - descarga valida de `application/pdf` via `/api/quote-sessions/[quoteSessionId]/exports/[exportId]/pdf`
- `pnpm staging:bundle:smoke` ahora valida export metadata + binary PDF download en hosted solo despues de confirmar `runtime-sync`.
- `pnpm staging:hotelbeds:smoke` ahora incluye `transfer_after_hotel_choice` y tambien aborta si staging no reporta el SHA o migration head esperados.
- el release candidate actual incluye el refresh del workbench operator-facing a Antigravity, la localizacion visible en espanol, continuidad resumida en el header sticky y el timeline de versiones operatorio
- el release candidate actual eleva la referencia de migracion requerida a `20260310190000_operator_notes_and_quote_versions.sql`

Notas operativas vigentes:

- GitHub queda publico por decision de plan gratuito.
- `Vercel for Git` ya esta conectado al repo `developer-berion/AI-Travel-Agent`.
- `Require Verified Commits` esta habilitado en Vercel; los commits locales sin firma verificada disparan el webhook Git pero el preview queda cancelado antes de build.
- El camino verificado para release sigue siendo:
  - preview por PR/branch con commits verificados
  - merge a `main` via PR
  - `manual deploy + smoke` como fallback operativo si la firma verificada no esta disponible desde el entorno local
- El cierre de sincronizacion ya exige:
  - migraciones remotas aplicadas hasta `20260310190000_operator_notes_and_quote_versions.sql`
  - bucket privado `quote-exports`
  - `/api/runtime-sync` alineado al release candidate
  - rerun de ambos smokes hosted sin drift

## Release summary source

- El resumen operativo para la PR de este candidato vive en `docs/technical/release-candidate-2026-03-11-staging.md`.
