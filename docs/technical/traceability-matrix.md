# Traceability Matrix

| PMOS Requirement | Engineering Surface | Tests |
| --- | --- | --- |
| RF-003 Workspace de cotizaciones | `apps/web/app/(workspace)/layout.tsx`, `apps/web/components/workbench/session-sidebar.tsx`, `apps/web/app/globals.css` | `apps/web/e2e/workspace-smoke.spec.ts` |
| RF-004 Reapertura con resumen superior | `apps/web/app/(workspace)/quotes/[quoteSessionId]/page.tsx`, `packages/database/src/context-package.ts` | `packages/database/src/context-package.test.ts` |
| RF-016 Clarificacion minima | `packages/orchestration/src/ai-runtime.ts`, `packages/orchestration/src/quote-command-runner.ts`, `packages/domain/src/index.ts`, `apps/web/components/quote/right-rail.tsx` | `packages/orchestration/src/ai-runtime.test.ts`, `packages/orchestration/src/context-package.test.ts`, `packages/orchestration/src/quote-command-runner.test.ts`, `packages/domain/src/state-machine.test.ts` |
| RF-020 Cotizacion compartible | `apps/pdf-renderer/src/index.ts`, `apps/web/app/(workspace)/quotes/[quoteSessionId]/export/[exportId]/page.tsx`, `apps/web/app/api/quote-sessions/[quoteSessionId]/exports/[exportId]/route.ts`, `apps/web/app/api/quote-sessions/[quoteSessionId]/exports/[exportId]/pdf/route.ts`, `apps/web/components/quote/export-quote-button.tsx`, `apps/web/components/quote/right-rail.tsx`, `apps/web/lib/quote-export-storage.ts`, `packages/database/src/context-package.ts`, `packages/domain/src/index.ts`, `packages/orchestration/src/quote-command-runner.ts`, `supabase/migrations/20260310163000_quote_exports_storage.sql` | `apps/pdf-renderer/src/index.test.ts`, `apps/web/e2e/workspace-smoke.spec.ts`, `packages/database/src/context-package.test.ts`, `packages/orchestration/src/quote-command-runner.test.ts`, `scripts/run-staging-bundle-review-smoke.mjs` |
| RF-025 Fallback de actividades | `packages/orchestration/src/ai-runtime.ts`, `packages/hotelbeds/src/anchor-resolution.ts`, `packages/hotelbeds/src/real-adapter.ts`, `packages/hotelbeds/src/mock-adapter.ts`, `scripts/verify-hotelbeds-connectivity.mjs` | `packages/orchestration/src/ai-runtime.test.ts`, `packages/hotelbeds/src/anchor-resolution.test.ts`, `packages/hotelbeds/src/mock-adapter.test.ts`, `packages/hotelbeds/src/real-adapter.test.ts` |
| RF-030 Version activa unica | `QuoteSession.activeQuoteVersion`, incrementos en `packages/orchestration/src/quote-command-runner.ts`, persistencia de bundle en `packages/database/src/context-package.ts` | `packages/domain/src/state-machine.test.ts`, `packages/orchestration/src/quote-command-runner.test.ts` |
| RF-032 Taxonomia comercial | `packages/domain` enum de `CommercialStatus`, resumen y right rail del workspace | `packages/domain/src/state-machine.test.ts` |

## Engineering Sync Controls

| Control | Engineering Surface | Validation |
| --- | --- | --- |
| Release candidate anti-drift | `apps/web/app/api/runtime-sync/route.ts`, `apps/web/lib/runtime-sync.ts`, `.env.example` runtime sync vars | `apps/web/e2e/workspace-smoke.spec.ts`, `scripts/run-staging-hotelbeds-smoke.mjs`, `scripts/run-staging-bundle-review-smoke.mjs` |
