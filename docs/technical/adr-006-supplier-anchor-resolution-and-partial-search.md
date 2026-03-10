# ADR-006 Supplier Anchor Resolution and Partial Search

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

`Hotelbeds` ya estaba autenticado y validado en sandbox, pero el workbench seguia recibiendo solo lenguaje natural. Eso dejaba dos fallos de arquitectura:

- la aclaracion de un operador podia perder el contexto ya extraido en el turno previo
- el command runner intentaba tratar todos los `requestedServiceLines` como igualmente listos, aunque `transfer` no tuviera anchors exactos

En la practica, eso hacia que el sistema fuera demasiado binario: o buscaba demasiado pronto, o devolvia errores de proveedor demasiado tarde.

## Decision

- `packages/orchestration/src/ai-runtime.ts` ahora fusiona una aclaracion con el `StructuredIntake` existente en lugar de reemplazarlo ciegamente.
- La extraccion base ya incluye `childAges` e `infants` para que la ocupacion supplier-backed no dependa de inferencias posteriores.
- `packages/hotelbeds/src/anchor-resolution.ts` introduce una capa supplier-specific de resolucion antes del adapter real:
  - mapea destinos conocidos a `hotelDestinationCode` y `activityDestinationCode`
  - resuelve transfers solo cuando existen anchors exactos de aeropuerto y propiedad
  - bloquea transfers genericos con una nota explicita en lugar de dejar que fallen mas tarde en el API
- `packages/orchestration/src/quote-command-runner.ts` ya no busca todos los servicios por default:
  - ejecuta solo los `serviceLines` con readiness `ready`
  - si hay servicios bloqueados, mantiene el hilo en `clarifying`
  - si hay resultados parciales, conserva shortlists ya utiles y deja una pregunta pendiente honesta

## Consecuencias

- El sistema puede producir `partial quote + clarification` sin perder el hilo ni mentir sobre readiness.
- `Hotelbeds` deja de ser un adapter que simplemente falla por falta de anchors; ahora recibe un intake mas disciplinado.
- La UI del `RightRail` muestra readiness por servicio en lugar de solo blockers globales.
- El runtime hosted puede seguir en `HOTELBEDS_PROVIDER=mock` hasta validar esta wave con operadores, pero la capa tecnica ya esta lista para activar `hotelbeds` en destinos soportados.

## Siguiente paso tecnico

- ampliar el registry de anchors con mapping mantenible por tenant
- introducir seleccion de propiedad supplier-backed desde shortlist para cerrar el loop de `transfer after hotel choice`
- validar el flujo real en staging con `HOTELBEDS_PROVIDER=hotelbeds`
