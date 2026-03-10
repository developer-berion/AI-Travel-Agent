# ADR-011 PDF Exports and Storage Artifacts

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

ADR-010 dejo resuelto el `export snapshot real`, pero el sistema todavia no materializaba el artefacto compartible prometido por `generate_quote_pdf`:

- no existia un PDF binario
- no habia fila persistida separando snapshot de export artifact
- no habia storage path estable para descarga posterior
- los smokes hosted no cubrian ni `binary PDF download` ni `transfer after hotel choice`

Eso hacia que `/quotes/[quoteSessionId]/export/[exportId]` siguiera representando un snapshot congelado, no un export versionado con storage real.

## Decision

- `apps/pdf-renderer` deja de ser placeholder y pasa a renderizar un PDF binario real con `pdf-lib`.
- Se introduce `public.quote_exports` como frontera persistente entre:
  - snapshot inmutable de contexto en `quote_context_snapshots`
  - artefacto binario descargable con metadata (`file_name`, `mime_type`, `storage_bucket`, `storage_path`, `file_size_bytes`)
- `packages/orchestration/src/quote-command-runner.ts` ya no trata `generate_quote_pdf` como alias de snapshot:
  - crea snapshot congelado
  - renderiza PDF
  - escribe el archivo via `quoteExportStorage`
  - persiste la fila `quote_exports`
  - solo despues mueve la sesion a `exported`
- `apps/web` introduce:
  - `quote-export-storage` con boundary `mock` versus `Supabase Storage`
  - `GET /api/quote-sessions/[quoteSessionId]/exports/[exportId]` para metadata + snapshot
  - `GET /api/quote-sessions/[quoteSessionId]/exports/[exportId]/pdf` para descarga binaria autenticada
- Los smokes se extienden para cubrir:
  - `bundle review -> exported -> PDF download`
  - `transfer_after_hotel_choice`

## Consecuencias

- `exportId` ya representa el artefacto exportado, no el snapshot.
- El bucket de storage queda privado; la descarga operator-facing pasa por una route autenticada del workbench.
- Snapshot y artefacto quedan desacoplados, permitiendo re-render futuro o nuevas variantes sin perder la congelacion original del contexto.
- La cobertura local ya valida el flujo completo hasta `application/pdf`; la ejecucion hosted de los nuevos smokes depende de credenciales staging fuera del repo.

## Siguiente paso tecnico

- ejecutar `pnpm staging:bundle:smoke` y `pnpm staging:hotelbeds:smoke` con env real y `runtime-sync` alineado al mismo SHA para sellar la verificacion hosted
- decidir si el delivery final del PDF requiere signed URLs, email handoff o branding visual mas fuerte
