# ADR-005 Hotelbeds Staging Baseline

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

El staging ya estaba activo sobre `Supabase` y `OpenAI`, pero aun faltaba abrir la frontera real del proveedor `Hotelbeds`.

La limitacion de esta pasada es deliberada: el sistema todavia no tiene resuelto el subsistema completo de `mapping` natural -> `destinationCode/from/to` por servicio. Por eso no es correcto activar `Hotelbeds` como path default del workbench mientras el intake siga llegando solo como lenguaje natural.

## Decision

- Se fija `HOTELBEDS_PROVIDER=mock|hotelbeds` como toggle runtime explicito.
- `@alana/hotelbeds` pasa de mock-only a frontera dual:
  - `mock adapter` para local/CI y para staging sin anchors supplier-ready.
  - `real adapter` con firma oficial `Api-key + X-Signature` y credenciales separadas por suite:
    - `HOTELBEDS_HOTELS_*`
    - `HOTELBEDS_ACTIVITIES_*`
    - `HOTELBEDS_TRANSFERS_*`
- Los metodos oficiales elegidos para la wave de quoting son:
  - `Hotels Booking API`: `POST /hotel-api/1.0/hotels`
  - `Hotels Booking API`: `POST /hotel-api/1.0/checkrates` solo para recheck
  - `Activities Booking API`: `POST /activity-api/3.0/activities`
  - `Transfers Booking API`: `GET /transfer-api/1.0/availability/...`
- `Content API` y `Cache API` quedan fuera del path transaccional de esta pasada; se reservan para `mapping`, enrichment y futura optimizacion.
- Se agrega `pnpm hotelbeds:verify` para validar credenciales sandbox con requests oficiales y ejemplos de la documentacion sin persistir secretos en el repo.

## Consecuencias

- El repo ya puede validar `Hotelbeds test` en los tres dominios (`hotels`, `activities`, `transfers`) con credenciales reales.
- El runtime sigue seguro por defecto: si no hay anchors supplier-ready, el adapter real devuelve `invalid_anchor_or_mapping` y el staging puede permanecer en `mock`.
- La siguiente wave tecnica ya no es autenticacion ni firma; es `anchor mapping + supplier-ready intake extraction` para poder activar `HOTELBEDS_PROVIDER=hotelbeds` en el workbench sin degradar el flujo operator-facing.
