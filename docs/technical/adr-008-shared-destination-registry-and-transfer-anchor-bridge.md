# ADR-008 Shared Destination Registry and Transfer Anchor Bridge

- Fecha: 2026-03-10
- Estado: Accepted

## Contexto

La wave anterior dejo el sistema con `partial search + clarification`, pero todavia habia dos grietas tecnicas:

- `packages/orchestration/src/ai-runtime.ts` mantenia su propio listado de destinos soportados, separado del registry de `packages/hotelbeds/src/anchor-resolution.ts`
- la resolucion de `transfer` dependia demasiado del texto raw y no podia reutilizar anchors ya estructurados si el hilo ya conocia una propiedad o una ruta exacta

Eso abria dos riesgos reales:

- el runtime AI podia extraer un destino "soportado" que luego el supplier layer no reconocia exactamente igual
- el siguiente paso tecnico de `transfer after hotel choice` iba a requerir reescribir la resolucion de anchors en lugar de extenderla

## Decision

- `packages/hotelbeds/src/anchor-resolution.ts` pasa a exponer helpers compartidos para destinos soportados:
  - `resolveSupportedDestinationAnchor`
  - `extractSupportedDestinationKey`
- `packages/orchestration/src/ai-runtime.ts` deja de mantener un registry local y reutiliza el helper compartido para detectar destinos soportados de forma accent-safe.
- La resolucion de transfers ahora acepta anchors ya estructurados en el intake:
  - si `transferFrom*` y `transferTo*` ya existen, conserva la ruta como `ready`
  - si existe una propiedad estructurada (`transferPropertyCode`, `transferPropertyType`, `transferPropertyLabel`) y el texto hace referencia generica al hotel o la propiedad, la usa para cerrar la ruta sin depender de un alias textual exacto
- El adapter real endurece sus contratos con pruebas de:
  - payload de `occupancies` con `childAges`
  - bloqueo cuando faltan edades de ninos
  - mapeo explicito de errores `401` a `auth_or_signature_error`

## Consecuencias

- El registry de destinos soportados deja de duplicarse entre AI y supplier layer.
- El sistema detecta mejor destinos soportados en lenguaje natural con variaciones como `París` sin abrir drift entre capas.
- La resolucion de `transfer` queda preparada para una futura seleccion de propiedad supplier-backed, pero sin introducir todavia la fase completa de cart.
- Los contratos del adapter quedan mejor defendidos frente a fallos reales de sandbox y errores de configuracion.

## Siguiente paso tecnico

- persistir seleccion supplier-backed de propiedad desde shortlist/review
- mapear esa seleccion al estado estructurado del hilo sin acoplar UI a payloads raw
- cerrar el loop completo de `transfer after hotel choice` sobre el command layer
