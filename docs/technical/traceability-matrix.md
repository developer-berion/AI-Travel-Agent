# Traceability Matrix

| PMOS Requirement | Engineering Surface | Tests |
| --- | --- | --- |
| RF-003 Workspace de cotizaciones | `apps/web/app/(workspace)/layout.tsx`, `apps/web/components/workbench/session-sidebar.tsx`, `apps/web/app/globals.css` | `apps/web/e2e/workspace-smoke.spec.ts` |
| RF-004 Reapertura con resumen superior | `apps/web/app/(workspace)/quotes/[quoteSessionId]/page.tsx`, `packages/database/src/context-package.ts` | `packages/database/src/context-package.test.ts` |
| RF-016 Clarificacion minima | `packages/orchestration/src/ai-runtime.ts`, `packages/orchestration/src/quote-command-runner.ts` | `packages/orchestration/src/context-package.test.ts`, `packages/domain/src/state-machine.test.ts` |
| RF-020 Cotizacion compartible | `apps/web/app/(workspace)/quotes/[quoteSessionId]/export/[exportId]/page.tsx`, export snapshot path en `packages/database` | PDF renderer tests pendientes en siguiente slice |
| RF-025 Fallback de actividades | `packages/hotelbeds` adapter response model | `packages/hotelbeds/src/mock-adapter.test.ts` |
| RF-030 Version activa unica | `QuoteSession.activeQuoteVersion`, incrementos en `packages/orchestration/src/quote-command-runner.ts` | `packages/domain/src/state-machine.test.ts` |
| RF-032 Taxonomia comercial | `packages/domain` enum de `CommercialStatus`, resumen y right rail del workspace | `packages/domain/src/state-machine.test.ts` |
