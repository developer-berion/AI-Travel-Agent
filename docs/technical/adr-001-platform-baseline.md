# ADR-001 Platform Baseline

- Fecha: 2026-03-09
- Estado: Accepted

## Contexto

El PMOS cerro una baseline con `Next.js`, `Supabase`, `Vercel` y una arquitectura `workflow-first`.

## Decision

- Monorepo TypeScript con `pnpm + Turborepo`.
- `apps/web` con `Next.js 15 App Router` y `React 19`.
- BFF por `Route Handlers`, no `Server Actions` como API core.
- `Biome`, `Vitest` y `Playwright` como baseline de calidad.
- `Supabase` como sistema de registro para `Auth + Postgres + Storage`.
- `Vercel` como plataforma web y `GitHub Actions` como baseline CI.
- `Cloudflare` reservado como ruta de escalado futura.
- Runtime inicial en modo `mock` hasta contar con credenciales y defaults reales del tenant.

## Consecuencias

- Se puede construir el shell y el command model sin bloquearse por dependencias externas.
- La frontera con Hotelbeds queda encapsulada y reemplazable por adapters reales.
- El stack queda alineado con una ruta free-tier hasta piloto interno, pero no con operacion comercial final.
