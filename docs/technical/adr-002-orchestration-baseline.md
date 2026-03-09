# ADR-002 Orchestration Baseline

- Fecha: 2026-03-09
- Estado: Accepted

## Decision

- Patron `orchestrator-worker` minimo.
- `Route Handlers` emiten `QuoteCommandEnvelope`.
- La state machine vive en `@alana/domain`.
- La logica mock actual ya respeta `draft -> clarifying -> reviewing` y `archive`.
- La integracion AI real entra por `OpenAI Responses API`, no por `Chat Completions`.
- `gpt-5-mini` es el modelo default cuando `AI_PROVIDER=openai`.
- `previous_response_id` se preserva entre vueltas para no re-razonar ni inflar costo.
- Los shapes de OpenAI y Hotelbeds no salen de `packages/orchestration` y `packages/hotelbeds`.

## Consecuencias

- El frontend no contiene reglas de negocio core.
- El siguiente paso es reemplazar los adapters mock por persistencia y Hotelbeds reales.
- El command runner puede alternar entre runtime mock y OpenAI real sin cambiar el contrato con UI ni repositorio.
