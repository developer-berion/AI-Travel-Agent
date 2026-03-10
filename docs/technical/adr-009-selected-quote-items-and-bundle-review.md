# ADR-009 Selected Quote Items and Bundle Review

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

La baseline previa ya podia generar shortlists supplier-backed y dejar el hilo en `reviewing`, pero todavia faltaba la capa que convierte opciones sueltas en un bundle exportable:

- no existia persistencia real para la seleccion operator-facing de items
- `QuoteCommandEnvelope` todavia no cubria mutaciones explicitas de cart/bundle
- el workbench no mostraba un `bundle review` persistido ni recalculaba `export_ready` desde seleccion real

Eso dejaba una brecha entre `results_ready` y `generate_quote_pdf`: el hilo podia tener shortlists, pero no un estado versionado de seleccion previa a export.

## Decision

- se agrega la tabla `public.selected_quote_items` para persistir snapshots de `NormalizedOption` seleccionados por `quote_session_id + service_line`
- `packages/database/src/context-package.ts` pasa a construir `bundleReview` como vista derivada de:
  - `selectedItems`
  - `shortlists`
  - blockers por servicio faltante
  - warnings por `weakShortlist` y `caveat`
  - bloqueo por mezcla de monedas
- `packages/orchestration/src/quote-command-runner.ts` incorpora comandos tipados de mutacion:
  - `select_option_for_cart`
  - `replace_cart_item`
  - `remove_cart_item`
  - `refresh_bundle_review`
- la version activa del quote se incrementa cuando cambia la seleccion efectiva del bundle
- `apps/web` expone la seleccion desde la shortlist y muestra el `bundle review` en el right rail

## Consecuencias

- el sistema ya tiene una frontera persistida entre shortlist supplier-backed y bundle listo para export
- la UI opera sobre snapshots canonicos del dominio, no sobre payloads raw de Hotelbeds
- `export_ready` deja de ser una inferencia superficial y pasa a depender de una seleccion real por servicio
- la nueva tabla requiere rollout de migracion y RLS operator-managed en staging/prod antes de usar esta slice en runtime Supabase

## Siguiente paso tecnico

- aplicar la migracion `20260310111500_selected_quote_items_bundle_review.sql` en staging
- validar hosted `select_option_for_cart` con `QUOTE_REPOSITORY_MODE=supabase`
- extender la misma seleccion supplier-backed para `transfer after hotel choice` y export snapshot real
