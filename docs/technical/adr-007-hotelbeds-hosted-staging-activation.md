# ADR-007 Hotelbeds Hosted Staging Activation

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

La wave anterior dejo lista la frontera real de `Hotelbeds` y el sistema de `anchor resolution`, pero el staging canonico todavia no estaba consumiendo proveedor real desde el workbench hosted.

Eso dejaba una brecha operativa:

- las credenciales sandbox estaban validadas solo por probes tecnicos
- el runtime hosted seguia dependiendo de `HOTELBEDS_PROVIDER=mock`
- no existia un smoke reproducible que comprobara `Supabase Auth + hosted API + Hotelbeds` como un solo recorrido

## Decision

- Se activa `HOTELBEDS_PROVIDER=hotelbeds` en el proyecto hosted `alana-ai-agent`.
- Se mantiene `https://alana-ai-agent.vercel.app` como URL canonica de staging.
- Se agrega `scripts/run-staging-hotelbeds-smoke.mjs` y el comando `pnpm staging:hotelbeds:smoke` como verificacion repetible de staging real.
- El smoke cubre cuatro escenarios:
  - `hotel_only`
  - `activity_only`
  - `transfer_only`
  - `partial_transfer_blocked`
- El smoke crea un usuario temporal con `Supabase Admin API`, autentica contra `/api/auth/login`, ejecuta comandos reales del workbench y elimina el usuario al terminar.
- `pnpm hotelbeds:verify` se endurece para no ocultar fallos de configuracion con un `JSON.parse` engañoso cuando el error no viene serializado.

## Consecuencias

- El staging hosted ya valida el circuito real `Supabase -> Alana API -> Hotelbeds` para casos soportados por anchors supplier-ready.
- `Hotelbeds` deja de estar probado solo a nivel de conectividad y pasa a estar probado a nivel de journey operador.
- `Vercel for Git` queda conectado al repo `developer-berion/AI-Travel-Agent`, pero el proyecto exige `Require Verified Commits`.
- Como resultado, un push local sin firma verificada puede crear el deployment Git y aun asi quedar `Canceled` antes de build.
- La activacion sigue siendo deliberadamente acotada:
  - destinos soportados por el registry curado
  - `transfer` solo con pickup/dropoff supplier-ready
  - sin `checkrates`, booking ni enrichment por `Content/Cache API`

## Evidencia operativa

- `pnpm hotelbeds:verify` respondio `200` en:
  - `POST /hotel-api/1.0/hotels`
  - `POST /activity-api/3.0/activities`
  - `GET /transfer-api/1.0/availability/...`
- `pnpm staging:hotelbeds:smoke` paso en hosted con:
  - resultados supplier-backed para hotel, activity y transfer
  - fallback parcial honesto cuando `transfer` queda bloqueado
- `vercel git connect` ya responde que `developer-berion/AI-Travel-Agent` esta conectado al proyecto.
- Un push de prueba en `codex/vercel-preview-check` creo el deployment preview Git-backed, pero quedo cancelado porque el commit estaba `unsigned`.

## Siguiente paso tecnico

- ampliar el registry de anchors para reducir dependencia de destinos curados
- introducir seleccion supplier-backed de propiedad para cerrar `transfer after hotel choice`
- añadir contract tests mas finos sobre shapes reales de `Hotelbeds` observados en sandbox
