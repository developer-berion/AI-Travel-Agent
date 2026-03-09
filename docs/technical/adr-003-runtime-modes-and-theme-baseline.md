# ADR-003 Runtime Modes And Theme Baseline

- Fecha: 2026-03-09
- Estado: Accepted

## Contexto

La baseline inicial ya no es solo mock puro. El repo necesita una ruta controlada para pasar de `mock` a `supabase` y `openai` sin romper contratos, y el workspace UX/UI ya bloqueo un theme contract oficial para `light/dark`.

## Decision

- `AUTH_MODE` y `QUOTE_REPOSITORY_MODE` se controlan explicitamente con `mock | supabase`.
- `AI_PROVIDER` se controla explicitamente con `mock | openai`.
- `apps/web` mantiene una sola superficie operator-facing y expone el estado runtime en el top bar.
- El tema oficial usa `light` por defecto, `dark` como variante de primera clase, toggle visible en paginas top-level y persistencia local de la ultima eleccion explicita.
- La paleta base es neutra y operator-first; el acento azul queda reservado para foco, seleccion y estados activos discretos.

## Consecuencias

- Local y CI pueden correr con `mock` sin depender de credenciales externas.
- Staging y produccion pueden activar Supabase y OpenAI sin bifurcar el code path principal.
- La UI deja de consolidar la direccion visual calida provisional y queda alineada al handoff UX/UI bloqueado.
