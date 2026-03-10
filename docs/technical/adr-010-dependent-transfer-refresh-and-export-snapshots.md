# ADR-010 Dependent Transfer Refresh and Export Snapshots

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

La wave de `selected_quote_items + bundle review` dejo dos huecos tecnicos visibles:

- `select_option_for_cart` no podia ejecutarse desde `clarifying`, aunque el hilo ya tuviera una shortlist parcial util para que el operador eligiera hotel y cerrara anchors pendientes.
- `generate_quote_pdf` existia en el contrato del dominio, pero todavia no generaba un snapshot exportable real ni una ruta versionada de lectura.

Eso rompia el siguiente slice natural del sistema:

- `transfer after hotel choice` no podia cerrar el loop sobre el command layer
- la ruta `/quotes/[quoteSessionId]/export/[exportId]` seguia siendo placeholder

## Decision

- `packages/domain` permite comandos de cart/bundle desde `clarifying` cuando el hilo ya tiene shortlist parcial, y habilita la transicion `clarifying -> reviewing`.
- `packages/orchestration/src/quote-command-runner.ts` ahora trata la seleccion de hotel como input estructurado del hilo:
  - sincroniza `transferProperty*` desde metadata supplier-backed o desde el registry soportado
  - invalida seleccion previa de `transfer` cuando cambia el hotel
  - re-ejecuta la shortlist de `transfer` si la ruta queda supplier-ready despues de elegir hotel
- `packages/database/src/context-package.ts` endurece `bundleReview` para bloquear export no solo por shortlists existentes, sino por todos los `requestedServiceLines`, incluso si alguno sigue bloqueado.
- `generate_quote_pdf` deja de ser placeholder logico:
  - persiste un snapshot inmutable de export en `quote_context_snapshots`
  - usa `kind = quote_export_snapshot` como discriminador de payload
  - expone lectura real via `/api/quote-sessions/[quoteSessionId]/exports/[exportId]`
  - renderiza el snapshot congelado en `/quotes/[quoteSessionId]/export/[exportId]`

## Consecuencias

- El operador ya puede convertir una shortlist parcial de hotel en una shortlist dependiente de transfer sin salir del hilo ni reabrir intake manualmente.
- El sistema ya tiene `export snapshot real` versionado y server-rendered, aunque el renderer PDF binario siga pendiente.
- `bundleReview` deja de marcar `export_ready` cuando falta un service line pedido pero todavia bloqueado o sin resultados utilizables.

## Siguiente paso tecnico

- conectar el snapshot exportable a un renderer Node-only de PDF
- definir storage path y versionado de artefacto binario
- extender smoke hosted para validar `transfer after hotel choice` con un caso supplier-backed controlado
