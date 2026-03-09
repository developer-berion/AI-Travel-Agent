# Master Engineering Implementation Plan
## Resumen
Este plan toma como fuente de verdad el PMOS `AI-TRAVEL-PMOS`, especialmente el estado aprobado al 8 de marzo de 2026: `PRD v03`, `Input/Output Schema v01`, `Error/Fallback Strategy v01`, `Acceptance Criteria v01`, la baseline de arquitectura del 7 de marzo de 2026 y la baseline de calidad/evaluación. La implementación propuesta asume que el producto de código aún no existe y debe iniciarse como repo separado del PMOS, manteniendo el PMOS y Notion como control de producto y delivery, no como runtime.

## Base de trazabilidad
### Hechos confirmados
- El MVP es cotización asistida, no booking.
- Hotelbeds es la fuente inicial para hoteles, traslados y actividades.
- El usuario principal es el agente de viajes o usuario interno.
- Cada cotización es un hilo independiente con historial persistente.
- En MVP cada hilo pertenece a un solo operador; no hay handoff entre usuarios.
- El chat es la columna vertebral del flujo, pero no la única superficie de estado.
- La salida principal es una cotización compartible, con versión activa por hilo.
- El transcript completo no es la fuente principal de contexto; la continuidad se apoya en `context package`, snapshots y memory facts.
- `Activities` es la capa más frágil y su fallback parcial ya está aprobado.
- `Speech-to-text` es extensión controlada de fase 1; no bloquea el release base.
- La taxonomía comercial mínima está cerrada: `abierta`, `en seguimiento`, `compartida`, `avanzo fuera del sistema`, `cerrada sin avance`, `archivada`.
- La política más reciente de pricing para fase 1 es usar precios y taxes de Hotelbeds sin markup comercial expuesto; cualquier mención anterior a markup fijo queda supersedida por la decisión más nueva.

### Supuestos activos
- El workspace de implementación está vacío y el producto de ingeniería empezará desde cero.
- El repo de aplicación vivirá separado del repo PMOS; el PMOS seguirá siendo fuente canónica de producto.
- Se usará GitHub como SCM por defecto para CI/CD y despliegue en Vercel.
- El backend operativo base será `Supabase + Edge Functions + Postgres + Storage`, con `Cloudflare` reservado como ruta de escalado, no como complejidad de día uno.
- El vendor AI inicial será OpenAI en runtime, con arquitectura preparada para cambiar proveedor por configuración y contratos.
- No habrá búsqueda vectorial cross-thread en v1.
- La retención por defecto será 365 días para sesiones y exports, con revisión legal/comercial posterior.
- Los payloads raw de Hotelbeds no serán contrato interno ni tabla operativa; si se almacenan, será en debug seguro y con retención corta.

### Decisiones propuestas
- Arquitectura `workflow-first`, no chatbot libre.
- Patrón `orchestrator-worker` acotado, no multiagente abierto.
- `Next.js App Router` como frontend y BFF ligero; `Route Handlers` para comandos públicos, no `Server Actions` como API core.
- Monorepo TypeScript con paquetes compartidos de dominio, orquestación, integración, datos, evals y UI.
- Comandos tipados e idempotentes como contrato principal entre UI y backend.
- Estado de sesión y estado comercial modelados por separado.
- PDF generado desde un servicio Node dedicado, no desde la función edge principal.
- Jobs asíncronos mínimos en v1: PDF, evals, retries operativos y mantenimiento; lo demás síncrono o fan-out controlado.

### Preguntas abiertas no bloqueantes para planear
- Defaults reales de cuenta Hotelbeds: `source market`, `currency`, `language`, mappings y anchors.
- Ruta final de actividades: `Search-first` vs `Availability-first` según tenant.
- KPI de negocio prioritario para el piloto: velocidad, consistencia, soporte a conversión o control de margen.
- Inclusión efectiva o no de `speech-to-text` en el release inicial.
- Copy final comercial/legal de disclaimers visibles en PDF y quote shareable.

## 1. Resumen Ejecutivo Técnico
- Se va a construir una plataforma web autenticada de trabajo para agentes internos que recibe solicitudes naturales, estructura el caso, valida readiness por servicio, consulta Hotelbeds mediante adaptadores tipados, presenta shortlist/comparativas, permite selección en cart de cotización, gestiona bundle review y genera PDF versionado.
- No se va a construir booking, pagos, emisión, postventa, B2C, multi-proveedor runtime, colaboración multioperador, markup comercial avanzado, search semántico cross-thread ni speech-first como dependencia del release base.
- Los principios de ingeniería serán: `contract-first`, `state-machine-first`, `supplier-grounded`, `typed commands`, `single source of truth for quote state`, `auditability by default`, `minimal moving parts first`, `future-safe boundaries without fake abstraction`.
- Los riesgos dominantes son: mismatch con la cuenta real de Hotelbeds, degradación de UX por hilos largos, fragilidad de activities, desacople insuficiente entre transcript y estado estructurado, subestimación del trabajo de anchor mapping, y falta de release gates AI + deterministic combinados.

## 2. Traducción del Producto a Sistema de Ingeniería
- Desde arquitectura, el producto no es un chat genérico; es un `quote operating system` con un front conversacional y un núcleo transaccional/stateful.
- Los dominios del sistema son: `Operator Workspace`, `Conversation & Intake`, `Quote Domain`, `Recommendation & Packaging`, `Supplier Integration`, `Export`, `Observability & Audit`, `Governance & Quality`.
- Los bounded contexts principales serán:
- `Identity & Access`: login, ownership, sesiones autenticadas.
- `Quote Session Management`: creación, reanudación, archivado, estado comercial, versión activa.
- `Conversation Intelligence`: extracción, clasificación, clarificación, packaging lingüístico.
- `Quote Orchestration`: máquina de estados, comandos, transiciones, invalidaciones parciales.
- `Supplier Search`: intents, ejecución por servicio, errores, recheck.
- `Recommendation & Cart`: ranking, shortlist, compare, cart, bundle.
- `Export & Document`: snapshot exportable, PDF, versionado.
- `Audit & Quality`: eventos, traces, evals, release gates.
- Core del sistema: `Quote Session`, `Structured Intake`, `State Machine`, `Hotelbeds Adapters`, `Normalized Options`, `Cart/Bundle`, `PDF Export`, `Audit`.
- Soporte del sistema: `auth`, `Notion/PMOS traceability`, `dashboards`, `cost monitoring`, `background jobs`, `feature flags`.

## 3. Fases de Implementación End-to-End
### Fase 0. Ingesta de PMOS y baseline técnico
Objetivo: congelar la traducción de PMOS a arquitectura de ingeniería sin reabrir discovery.
Entregables: engineering blueprint, ADRs iniciales, catálogo de contratos, matriz requisito->componente->test, lista cerrada de dependencias externas.
Decisiones clave: repo separado del PMOS; stack base `Next.js + Supabase + Vercel`; runtime AI inicial OpenAI; STT fuera del camino crítico.
Riesgos: leer documentos antiguos superseded; heredar contradicciones de pricing o ownership.
Dependencias: `PRD v03`, `Input/Output Schema`, `Error/Fallback`, `Acceptance Criteria`, arquitectura Notion del 7 de marzo.
Criterio de salida: backlog de ingeniería creado y cada RF del PRD mapeado a un workstream técnico.

### Fase 1. Setup de repositorio y plataforma base
Objetivo: crear el repo de aplicación, toolchain y ambientes sin lógica de negocio.
Entregables: monorepo, CI inicial, entornos `local/dev/staging/prod`, scaffolding web, Supabase projects, secret management, feature flags.
Decisiones clave: `pnpm + Turborepo`, `Biome + TypeScript strict + Vitest + Playwright`, GitHub Actions, Vercel preview/staging/prod, Supabase por ambiente.
Riesgos: mezclar código Node con paquetes Deno-hostile; secretos locales mal gestionados.
Dependencias: acceso GitHub/Vercel/Supabase, naming de ambientes, reglas de branch protection.
Criterio de salida: app web vacía desplegada, auth funcional básica y pipeline verde.

### Fase 2. Modelo de dominio, auth y persistencia
Objetivo: implementar el núcleo de datos y ownership antes del AI flow.
Entregables: SQL inicial, RLS, tipos compartidos, tablas de sesiones/mensajes/intakes/cart/bundle/export/audit, semántica de estado.
Decisiones clave: `quote_session = chat_thread` en v1; session state y commercial status separados; `quote_price` separado de `source_price` aunque ambos valgan igual en fase 1.
Riesgos: acoplar tablas a payload raw de Hotelbeds; no modelar invalidación y versionado desde el inicio.
Dependencias: confirmación mínima de taxonomía, retención y ownership.
Criterio de salida: modelo de datos migrado en dev/staging con tests de RLS y fixtures.

### Fase 3. Frontend workbench base
Objetivo: entregar el shell operativo antes de la inteligencia profunda.
Entregables: login, workspace de quotes, sidebar de historial, thread view, top bar, right rail, compare tray placeholder, resumen superior del hilo.
Decisiones clave: App Router con layout persistente; Route Handlers como BFF; state client mínimo; no depender del transcript para continuidad.
Riesgos: UX demasiado “chat-only”; rendimiento pobre en hilos largos.
Dependencias: modelo de datos, auth, view models mínimos.
Criterio de salida: operador puede crear, retomar, archivar y reactivar sesiones con metadata visible.

### Fase 4. Columna vertebral de orquestación AI
Objetivo: construir la máquina de estados y el command layer.
Entregables: `QuoteCommandEnvelope`, `QuoteCommandResult`, handlers, state machine, context package assembler, prompt registry versionado.
Decisiones clave: patrón `orchestrator-worker`; no agente libre con tool autonomy; idempotencia obligatoria.
Riesgos: convertir el backend en una función gigante; fallback implícito sin trazabilidad.
Dependencias: dominio y persistencia implementados.
Criterio de salida: flujo `start -> clarify -> search-ready -> review` operativo con auditoría y snapshots.

### Fase 5. Integración Hotelbeds y anchor resolution
Objetivo: encapsular Hotelbeds por servicio y validar búsqueda real.
Entregables: adapters de hoteles, transfers y activities; servicio de anchor mapping; taxonomía de errores; fixtures/contract tests; recheck policy.
Decisiones clave: hoteles usan Booking API para live availability, Content API para enrichment y `checkrates` solo cuando haga falta; transfers usan Booking API para verdad final; activities usan búsqueda supplier-backed y availability final antes de cierre cuando aplique.
Riesgos: defaults tenant no confirmados; anchors incompletos; fragilidad de activities.
Dependencias: credenciales y mappings de cuenta Hotelbeds, políticas de rate limits.
Criterio de salida: búsquedas reales en staging para al menos 1 escenario feliz y 1 fallback por servicio.

### Fase 6. Ranking, packaging, cart y bundle review
Objetivo: convertir supply normalizado en una propuesta comercial utilizable.
Entregables: ranking pipelines, weak-shortlist detection, compare view, cart actions, bundle review, blockers y warnings.
Decisiones clave: `best_match` y `three_options` son políticas distintas; máximo 3 opciones por defecto; partial quote permitido solo con disclosure explícito.
Riesgos: shortlist bonita pero poco operativa; falta de delta view en requote.
Dependencias: adapters funcionales y quote domain tipado.
Criterio de salida: operador puede seleccionar, reemplazar y revisar bundle con señales claras de stale/blockers.

### Fase 7. PDF export y versionado comercial
Objetivo: transformar bundle review en artefacto versionado compartible.
Entregables: snapshot exportable, renderer HTML->PDF, storage path, control de versiones, links de descarga, export gating.
Decisiones clave: renderer Node dedicado; export siempre desde snapshot pre-export; mixed currency bloquea; disclaimers obligatorios.
Riesgos: HTML/PDF divergentes; export silencioso de bundle stale; dependencia errónea de factsheets nativos Hotelbeds.
Dependencias: bundle review estable y política de visibilidad/precios.
Criterio de salida: PDF generado desde staging con contenido mínimo validado y versión activa visible en hilo.

### Fase 8. Requote resiliente, seguridad, observabilidad y evals
Objetivo: endurecer el sistema antes de piloto.
Entregables: invalidación parcial, observabilidad end-to-end, eval suite, smoke tests, rate limiting, threat model, alertas.
Decisiones clave: retries acotados; no requote global salvo cambio estructural; STT sigue fuera si compromete calidad.
Riesgos: false confidence en outputs; ceguera en fallbacks; seguridad blanda en tool calling.
Dependencias: flows core listos.
Criterio de salida: gates de calidad corriendo en CI y dashboards base activos.

### Fase 9. CI/CD, staging operativa y rehearsals
Objetivo: asegurar despliegue repetible y reversible.
Entregables: pipelines completos, staging conectada a Hotelbeds sandbox/test account, release checklist, rollback playbook.
Decisiones clave: trunk-based con ramas cortas; PR previews; promote-to-staging; producción con aprobación manual.
Riesgos: drift entre funciones, DB y web; migraciones no reversibles.
Dependencias: infra y tests disponibles.
Criterio de salida: al menos dos deploys completos exitosos de rehearsal con rollback probado.

### Fase 10. Piloto interno controlado
Objetivo: validar utilidad real con operadores sin abrir demasiada superficie.
Entregables: cohort piloto, dataset de casos reales, loop de feedback, reporte de defectos, tuning de prompts y packaging.
Decisiones clave: piloto acotado a casos retail estándar; escalación humana explícita; STT opcional desactivado por defecto.
Riesgos: usar casos fuera de soporte y juzgar mal el sistema; confundir defectos de proceso con defectos de producto.
Dependencias: staging estable, runbooks y soporte.
Criterio de salida: cumplimiento base de SLA, ausencia de fallos fatales y feedback operador mayormente útil.

### Fase 11. Hardening y handoff operativo
Objetivo: dejar el producto listo para operación inicial seria.
Entregables: incident runbooks, ownership matrix, training notes, release scorecard, backlog de fase 2.
Decisiones clave: freeze de alcance MVP; no abrir nuevos servicios ni colaboración multioperador.
Riesgos: scope creep post-piloto; deuda no priorizada.
Dependencias: resultados del piloto.
Criterio de salida: release candidate aprobado con backlog post-release priorizado.

## 4. Team Design / Equipo de Ingeniería Necesario
### Engineering Lead / AI Engineering Lead
Misión: cerrar arquitectura, secuencia técnica y criterio de calidad.
Responsabilidades: ADRs, trade-offs, roadmap técnico, coordinación con PMOS, validación de riesgos y gates.
Conocimientos: systems design, LLM systems, Next.js, serverless, supplier integrations.
Entregables: architecture pack, tech backlog, release gates, risk register.
Dependencias: PM/PMOS, Integration, QA/Evals, Platform.
IA puede: generar drafts de ADRs, backlog técnico, diagramas y matrices.
Humano valida: decisiones arquitectónicas finales, trade-offs de costo/latencia y aceptación de riesgos.

### Frontend Engineer / UX Engineer
Misión: construir el workbench operator-facing sin depender del transcript como memoria.
Responsabilidades: shell, App Router, thread UX, compare tray, right rail, bundle review, PDF preview state.
Conocimientos: Next.js App Router, accessibility, performance, operational UX.
Entregables: `apps/web`, component model, state strategy, Playwright coverage de UX crítica.
Dependencias: Backend view models, Designer, QA.
IA puede: scaffolding de componentes, story states, test drafts.
Humano valida: densidad operativa, claridad visual y ergonomía real para agentes.

### Backend Application Engineer
Misión: implementar command handlers, domain services y persistencia.
Responsabilidades: API layer, command model, state transitions, cart/bundle logic, snapshots, audit events.
Conocimientos: TypeScript backend, Supabase, DDD pragmático, idempotencia, retries.
Entregables: `packages/domain`, `packages/database`, command services, migrations.
Dependencias: AI Engineer, Integration Engineer, Platform.
IA puede: boilerplate de handlers, schemas, tests.
Humano valida: invariantes de negocio, consistencia transaccional, seguridad de mutaciones.

### AI / LLM Engineer
Misión: diseñar y operar la capa de reasoning, prompts y evals AI.
Responsabilidades: prompt registry, tool schemas, routing por nodo, fallbacks, cost controls, evals de comportamiento.
Conocimientos: Responses API/tool use, structured outputs, eval design, trajectory review.
Entregables: `packages/orchestration`, prompts versionados, model routing policy, eval suites AI.
Dependencias: Backend, QA/Evals, Product.
IA puede: redactar prompts, generar gold-case variants, proponer rubrics.
Humano valida: políticas de preguntas, packaging, límites del agente y comportamiento bajo ambigüedad.

### Supplier Integration Engineer
Misión: encapsular Hotelbeds y evitar acoplamiento tóxico al proveedor.
Responsabilidades: adapters por servicio, signing, endpoint strategy, anchor mapping, error normalization, recheck logic.
Conocimientos: Hotelbeds/HBX APIs, resiliencia HTTP, cache/content fusion, supplier observability.
Entregables: `packages/hotelbeds`, fixtures, contract tests, tenant config map.
Dependencias: Backend, AI Engineer, QA.
IA puede: generar clients tipados, tablas de mapping iniciales, fixtures desde docs.
Humano valida: semántica real de supplier, defaults tenant, políticas de recheck y fallbacks.

### QA / Evals Engineer
Misión: unir software testing con AI evals en un solo sistema de release quality.
Responsabilidades: scenario library, deterministic gates, contract tests, E2E, AI evals, release sign-off.
Conocimientos: Playwright, contract testing, eval design, rubric calibration.
Entregables: suites de tests, gold set, dashboards de calidad, release scorecards.
Dependencias: todos los workstreams.
IA puede: generar casos, data variants, eval harnesses.
Humano valida: escenarios canónicos, umbrales de release, lectura de regresiones y advisory vs blocker.

### DevOps / Platform Engineer
Misión: construir la plataforma de entrega, secretos, despliegue y rollback.
Responsabilidades: CI/CD, entornos, secret management, infra por ambiente, observabilidad base, cost controls.
Conocimientos: GitHub Actions, Vercel, Supabase, secret rotation, release engineering.
Entregables: pipelines, env matrix, deployment playbooks, rollback drills.
Dependencias: Engineering Lead, Backend, QA.
IA puede: generar pipelines y checklists.
Humano valida: permisos, aislamiento de ambientes, rollback y governance de secretos.

### Product-minded Designer / Operator UX Designer
Misión: mantener la UX alineada con operación real y no con patrones de chat genéricos.
Responsabilidades: densidad informativa, compare UX, right rail, error states, PDF shareable.
Conocimientos: B2B operator UX, information architecture, accessibility.
Entregables: shells, interaction specs, visual hierarchy, state specs.
Dependencias: Frontend, Product, QA.
IA puede: generar exploraciones visuales y content patterns.
Humano valida: utilidad operativa, claridad para agentes y calidad del documento shareable.

### Security / AppSec
Misión: endurecer acceso, secretos, tool misuse y data boundaries.
Responsabilidades: threat model, secret flow, RLS review, prompt injection controls, logging policy.
Conocimientos: AppSec serverless, auth/RLS, secrets governance, abuse cases.
Entregables: threat model, AppSec checklist, hardening gates.
Dependencias: Platform, Backend, AI.
IA puede: generar threat matrices y abuse-case drafts.
Humano valida: riesgos reales, severidad, controles obligatorios y go/no-go de seguridad.

### Data / Analytics Engineer
Misión: convertir audit events y eval runs en señales de operación y mejora.
Responsabilidades: marts operativos, KPI/SLA dashboards, event quality, release analytics.
Conocimientos: SQL analytics, event modeling, dashboarding.
Entregables: marts, dashboards, metric dictionaries.
Dependencias: Backend, QA/Evals, Product.
IA puede: proponer consultas, paneles y definiciones.
Humano valida: semántica de negocio y decisiones basadas en datos.

## 5. Arquitectura de Sistema Recomendada
### Decisión de arquitectura
- Frontend en `Next.js App Router` sobre Vercel.
- BFF ligero en `Next.js Route Handlers` para resolver sesión, emitir command envelopes y proteger el backend.
- Backend core en `Supabase Edge Functions` y paquetes TS compartidos.
- Persistencia en `Supabase Postgres` con `Auth`, `Storage` y RLS.
- Servicio Node dedicado para PDF.
- Ruta de escalado a `Cloudflare Workers + Queues` solo cuando el piloto justifique externalizar jobs y concurrency-heavy workloads.

### Módulos
- `apps/web`: shell, conversación, right rail, compare, cart, review, export UX.
- `packages/domain`: entidades, enums, invariantes, state machine, policies.
- `packages/orchestration`: command handlers, context assembly, node routing, prompt adapters.
- `packages/hotelbeds`: clients, schemas, adapters, normalization, error taxonomy, anchor resolution.
- `packages/database`: repositories, SQL typing, RLS-aware data access.
- `packages/evals`: datasets, graders, scenario registry, regression harness.
- `packages/shared`: ids, tracing, time/currency helpers, common schemas.
- `supabase/functions`: deployment entrypoints para command API y jobs.
- `supabase/migrations`: SQL versionado.
- `apps/pdf-renderer` o Node route runtime: HTML->PDF.
- `docs/technical`: ADRs, sequence diagrams, contracts, runbooks.

### Relaciones entre módulos
- UI nunca llama a nodos internos ni a Hotelbeds.
- UI llama BFF; BFF emite comandos; orchestrator ejecuta nodos; adapters llaman Hotelbeds; resultados vuelven como view models.
- Dominio es shared y no depende ni de React ni de payloads Hotelbeds.
- PDF consume un snapshot del bundle, nunca el estado mutable en vivo.

### APIs y contratos esperados
- `POST /api/quote-sessions`
- `GET /api/quote-sessions`
- `GET /api/quote-sessions/:id`
- `POST /api/quote-sessions/:id/commands`
- `GET /api/quote-sessions/:id/events`
- `GET /api/quote-sessions/:id/exports/:exportId`
- Tipos públicos: `QuoteCommandEnvelope`, `QuoteCommandResult`, `QuoteSessionState`, `CommercialStatus`, `RecommendationMode`, `ServiceLine`, `SearchIntentV1`, `NormalizedOptionV1`, `BundleReviewView`, `ContextPackageV1`, `AuditEventV1`.

### Sincronía vs asincronía
- Síncrono: login, carga de workspace, append message, clarification answer, readiness validation, search fan-out si entra en SLA.
- Asíncrono: PDF generation, eval runs, retries operativos, cache warming, replay/debug jobs.
- Fan-out concurrente: búsquedas por service line cuando el caso ya está listo; cada línea reporta estado parcial.

### Eventos y colas
- V1 usa `audit_events` + `async_jobs`/job table como backbone operacional.
- No Kafka, no event bus externo en día uno.
- Cloudflare Queues se habilita cuando PDF, retries o fan-out excedan el patrón de Postgres jobs y funciones edge.

### Trade-offs
- Se descarta microservicios tempranos porque el problema hoy es claridad de estado, no escala organizacional.
- Se descarta multiagente libre porque reduce predictibilidad y complica QA.
- Se descarta provider abstraction total porque generaría falsa genericidad; se adopta `canonical quote domain + adapter interface`.
- Se desacopla PDF del edge runtime porque Chromium/document rendering es mejor problema de Node que de Deno edge.

## 6. Arquitectura Frontend (Next.js)
### Estructura de aplicación
- `app/(auth)/login`
- `app/(workspace)/quotes`
- `app/(workspace)/quotes/[quoteSessionId]`
- `app/(workspace)/quotes/[quoteSessionId]/export/[exportId]`
- `app/api/...` para BFF y command proxy
- `components/workbench`, `components/chat`, `components/quote`, `components/cart`, `components/export`
- `lib/api`, `lib/auth`, `lib/tracing`
- `state/ui` para compare tray, draft del composer y filtros efímeros

### Server vs Client Components
- Server Components: layouts, auth gates, carga inicial de quote history, thread metadata, bundle snapshots, export pages.
- Client Components: composer, transcript interactivo, compare tray, cart actions, right rail live, badges de stale, command progress, optimistic UI.
- Regla: todo lo que sea SEO-irrelevante pero interactivo va al cliente; todo lo que sea estado inicial y guardias de sesión va al servidor.

### Layouts y rutas principales
- Root layout: providers, theme, telemetry hooks.
- Workspace layout: sidebar de historial + top bar + shell persistente.
- Quote session layout: conversación central + right rail persistente + compare tray condicional.
- Export layout: preview/read-only del artefacto versionado.

### Estado global y local
- Server state: React Query para cache de lecturas y mutaciones con invalidación por session/version.
- UI ephemeral state: Zustand o equivalente para compare selection, drawer state, draft input.
- No Redux.
- No estado de negocio crítico solo en client memory.

### Captura conversacional
- Composer primario texto/copy-paste.
- `Speech-to-text` aislado en un adapter de input y detrás de feature flag.
- Clarificación se muestra como preguntas focalizadas con chips o campos cortos, no como formulario gigante.
- Inputs estructurados manuales solo para corrección o refinamiento, no como primera interacción.

### Render de chat y resultados
- Transcript virtualizado para hilos largos.
- Assistant messages con bloques semánticos: resumen, faltantes, shortlist, compare, warnings, next actions.
- Result cards con `why it fits`, `tradeoff`, `caveat`, `add to cart`, `compare`, `replace`.
- Right rail con `readiness`, `service status`, `active quote version`, `commercial status`, `pending blockers`.

### Loading, streaming y skeletons
- Route segment `loading.tsx` para workspace y thread.
- Streaming de assistant copy y service status cuando aplique; si no, progresión por etapas visible.
- Skeletons por service line; nunca un spinner único global para todo.
- Export status con job polling/SSE y barra de progreso semántica.

### Error states
- Estados separados para `missing blockers`, `partial quote`, `weak shortlist`, `integration issue`, `stale bundle`, `export blocked`.
- Mensajes breves, operator-facing y accionables.
- Error fatal conserva input y estado confirmado.

### UX para edición/refinamiento
- Cambios de fechas, pax, budget o service mode disparan `apply_requote_change`.
- UI muestra delta: qué sigue válido, qué se invalida, qué entra en `needs_review` o `stale`.
- Cambios no resetean el hilo completo.

### Accesibilidad, performance y responsive
- A11y: foco visible, navegación teclado, regiones ARIA por panel, contraste alto, no depender solo de color.
- Performance: RSC, lazy load de compare/export, transcript virtualization, server-side data fetch inicial, suspense por panel.
- Responsive: escritorio optimizado primero; tablet soportada; móvil funcional para revisión, no como modo primario de operación compleja.

### Estructura sugerida de carpetas
```text
apps/web
apps/pdf-renderer
packages/domain
packages/orchestration
packages/hotelbeds
packages/database
packages/evals
packages/shared
supabase/functions
supabase/migrations
docs/technical
```

## 7. Arquitectura Backend / Application Services
### Servicios necesarios
- `session-service`
- `conversation-service`
- `readiness-service`
- `orchestrator-service`
- `hotelbeds-adapter-service`
- `ranking-packaging-service`
- `cart-bundle-service`
- `export-service`
- `audit-observability-service`
- `eval-service`

### API layer
- BFF valida sesión, genera `commandId` e `idempotencyKey`, y llama funciones internas.
- Backend expone solo comandos de alto nivel; no expone nodos privados.
- Toda respuesta devuelve `nextAction`, `sessionStateVersion`, `viewModelDelta`, `auditEventIds`.

### Auth / sessions
- Supabase Auth con cuentas provisionadas externamente.
- `email/password` como baseline; reset de contraseña permitido como utilidad operativa, no como scope crítico.
- Single-owner por `quote_session` con RLS estricta.
- Sessions web y sessions de quote separadas conceptualmente.

### Conversation engine
- Persiste mensajes.
- Invoca extracción estructurada.
- Concatena solo mensajes recientes relevantes.
- Escribe snapshots y memory facts según triggers.

### Orchestration layer
- Hace cumplir la state machine.
- Verifica precondiciones por comando.
- Decide el siguiente nodo.
- Orquesta fan-out por service line.
- Calcula invalidaciones parciales en requote.
- Dispara fallback o escalación.

### Request normalization
- Convierte input libre en `StructuredIntake`.
- Separa `blocking_fields`, `high_value_missing`, `contradictions`, `service_scope`, `recommendation_mode`.
- No construye payload Hotelbeds directamente desde texto libre.

### Hotelbeds adapter layer
- Recibe `SearchIntent` tipado.
- Enriquece con tenant config y mappings.
- Firma requests y ejecuta.
- Parsea errores a taxonomía interna.
- Normaliza resultados a `NormalizedOptionV1`.
- Mantiene referencias opacas como `rateKey` sin reinterpretarlas.

### Packaging / result formatting
- Ranking multi-stage.
- Weak-shortlist detector.
- Compare set assembler.
- Shareable quote builder.
- Bundle review builder.
- PDF snapshot builder.

### Audit trail / traceability
- Todo comando genera `audit_event`.
- Toda transición genera `state_transition_recorded`.
- Toda llamada supplier y fallback tiene `trace_id`.
- Se guarda referencia de prompt version, model, tool path y summary de ejecución.
- El sistema debe soportar replay lógico, no replay literal completo del transcript.

### Logging, rate limiting y retries
- Logs estructurados con `trace_id`, `quote_session_id`, `command_id`, `supplier_request_id`.
- Rate limiting por operador, por tenant config y por proveedor.
- Retry policy: 1 retry para errores transitorios, 0 para validation errors, recheck explícito para stale/expired rates.
- Circuit breaker básico por proveedor/servicio ante errores repetidos.

### Background jobs
- `generate_quote_pdf`
- `refresh_or_retry_supplier_call`
- `write_eval_run`
- `daily_quality_rollup`
- `cache_warm_or_mapping_sync`
- Jobs de larga duración no bloquean el hilo principal.

## 8. Capa AI / Orquestación Agentic
### Decisión principal
- No recomiendo `single-agent` monolítico.
- Recomiendo `orchestrator-worker` mínimo: un orquestador determinista y tres o cuatro workers de reasoning acotados.
- Workers propuestos: `Intake Extractor`, `Clarification Planner`, `Packaging Writer`, `Escalation Assessor`.
- Todo lo demás debe ser determinista o contract-driven.

### Responsabilidades del orquestador
- Validar estado actual y comando permitido.
- Ensamblar `context package` correcto.
- Elegir worker/prompt correcto.
- Aprobar o denegar tool access según readiness.
- Escribir snapshots/facts.
- Decidir fallback y escalación.
- Controlar costo y profundidad de reasoning.

### Herramientas del agente
- `extract_intake`
- `classify_support_depth`
- `select_clarification_question`
- `confirm_recommendation_mode`
- `build_search_plan`
- `run_hotel_search`
- `run_transfer_search`
- `run_activity_search`
- `detect_weak_shortlist`
- `package_quote_response`
- `write_context_snapshot`
- `write_memory_facts`
- `propose_escalation`
- Herramientas supplier solo disponibles cuando readiness es válida.
- El LLM no recibe herramientas arbitrarias ni acceso libre a internet.

### Memoria que sí debe existir
- Metadata de hilo.
- Confirmed quote state.
- Missing fields y pending question.
- Recent relevant messages.
- Snapshots operativos resumidos.
- Memory facts confirmados.
- Estado de shortlist/cart/bundle actual.

### Memoria que no debe existir
- Cross-thread vector memory.
- Raw supplier payload como memoria conversacional.
- Pricing volátil persistido como fact.
- Suposiciones no confirmadas.
- Resultados descartados como “verdad”.

### Manejo de prompts del sistema
- Un prompt maestro corto con reglas inmutables.
- Un prompt por nodo con objetivo, inputs permitidos y outputs estructurados.
- Un bloque de policy por servicio.
- Un bloque runtime con context package.
- Prompt registry versionado en código + referencia persistida en DB.
- Cambios de prompt pasan por PR + eval suite.

### Manejo de sesiones y ambigüedad
- El hilo conserva continuidad; el agente no “recuerda” por intuición, recuerda por facts/snapshots.
- Ambigüedad se resuelve preguntando solo lo necesario para desbloquear o mejorar de forma material.
- Regla operativa: resolver bloqueantes primero; después, como máximo dos aclaraciones adicionales de alto valor antes de la primera búsqueda útil, salvo exigencia real del supplier.

### Inputs incompletos y cuándo preguntar vs avanzar
- Preguntar si falta destino, fechas, ocupación base, service scope o anchor mínimo.
- Avanzar con caveats si faltan budget, nationality, category, cancellation preference u otros datos de alto valor no bloqueantes.
- Escalar primero si el caso cae en Nivel C de soporte o combina dos ejes fuertes de complejidad.

### Errores de herramienta y resultados vacíos
- `validation_error` o `missing_required_field`: volver a clarificación.
- `no_results`: ofrecer relajar criterio o continuar con otras capas.
- `weak_results`: devolver shortlist honesto con next action.
- `supplier_timeout` o `supplier_unavailable`: retry acotado, luego fallback parcial o mensaje operativo.
- `stale_or_expired_rate`: revalidate/requote controlado, nunca reemplazo silencioso.

### Fallbacks útiles
- Partial quote explícito.
- Continuar sin activities.
- Reducir shortlist a alternativa conservadora + opción de valor.
- Mostrar tensión presupuesto/nivel y pedir prioridad.
- Mantener el hilo abierto con siguiente paso claro.

### Prevención de sobre-ingeniería
- Nada de subagentes autónomos por servicio.
- Nada de RAG cross-thread en v1.
- Nada de planner general de múltiples pasos fuera de la state machine.
- Nada de runtime multi-provider AI fallback de día uno.
- Nada de vector DB hasta que el piloto pruebe que snapshots/facts no alcanzan.

### Model routing propuesto
- Modelo primario de reasoning/tool use: OpenAI Responses API con modelo de reasoning actual.
- Modelo rápido/costo bajo: OpenAI fast model para extracción simple, summaries y snapshots.
- Offline benchmark opcional: Anthropic/Gemini solo en evals comparativas, no en runtime v1.
- Fallback de modelo: solo para tareas lingüísticas no destructivas; no cambiar de modelo en una tool chain de supplier sin revalidación.

## 9. Integración con Hotelbeds
### Capa y módulo
- `packages/hotelbeds` será la única frontera de proveedor.
- Dentro: `clients`, `tenant-config`, `mappings`, `adapters/hotels`, `adapters/transfers`, `adapters/activities`, `normalizers`, `errors`.

### Aislamiento de lógica proveedor
- El orquestador construye `SearchIntent`.
- El adapter traduce a Hotelbeds.
- La UI solo consume view models del dominio.
- Ningún componente React ni prompt construye payload Hotelbeds.

### Contratos internos
- `HotelSearchIntentV1`
- `TransferSearchIntentV1`
- `ActivitySearchIntentV1`
- `NormalizedHotelOptionV1`
- `NormalizedTransferOptionV1`
- `NormalizedActivityOptionV1`
- `SupplierCallMetadataV1`
- `SupplierErrorV1`
- `AvailabilityStateV1`
- `RecheckRequirementV1`

### Manejo de errores y respuestas incompletas
- Error taxonomy única para todos los servicios.
- Distinción explícita entre `no_results`, `weak_results`, `unsupported_scope`, `invalid_anchor`, `supplier_unavailable`.
- Una respuesta incompleta nunca se presenta como paquete completo.
- `rateKey` y tokens opacos se copian y versionan, no se interpretan.

### Multi-proveedor futuro sin inflar MVP
- Preparar `SupplierAdapter` interface y `ProviderCapabilityRegistry`.
- No crear capa genérica de pricing/comercialización multi-supplier todavía.
- Mantener el `canonical quote domain` estable para que un proveedor futuro se conecte allí.
- No normalizar a “mínimo común denominador” prematuramente; priorizar Hotelbeds bien hecho.

### Riesgos funcionales y técnicos
- Tenant defaults y mappings pueden cambiar reglas bloqueantes.
- Destination/origin resolution es trabajo mayor y debe verse como subsistema, no helper.
- Activities puede requerir doble ruta de búsqueda/availability.
- Recheck hotel rate y pricing volatile pueden invalidar cart/bundle.
- Supplier docs públicas no sustituyen tenant testing real.

## 10. Modelo de Datos y Persistencia
### Base principal
- `Supabase Postgres` como sistema de registro.
- `Supabase Storage` para PDFs y artefactos.
- `Auth` para identidad.
- `JSONB` solo donde el esquema todavía necesita elasticidad controlada.

### Entidades principales
- `operator_profiles`
- `quote_sessions`
- `quote_messages`
- `structured_intakes`
- `service_requests`
- `search_intents`
- `search_executions`
- `normalized_options`
- `shortlists`
- `shortlist_items`
- `cart_items`
- `quote_bundles`
- `bundle_items`
- `quote_exports`
- `quote_context_snapshots`
- `quote_memory_facts`
- `fallback_events`
- `exception_cases`
- `audit_events`
- `prompt_versions`
- `llm_runs`
- `tool_runs`
- `eval_cases`
- `eval_runs`
- `hotelbeds_anchor_mappings`
- `tenant_supplier_config`

### Conversaciones y sesiones
- `quote_session` es la unidad operativa del hilo.
- Conserva `title`, `agency_name`, `trip_label`, `trip_start_date`, `status`, `commercial_status`, `recommendation_mode`, `active_quote_version`.
- Los mensajes se guardan completos, pero el runtime usa context package.

### Requests, cotizaciones y resultados
- `structured_intakes` versiona lo entendido.
- `service_requests` separa líneas de servicio.
- `search_intents` captura input tipado listo para supplier.
- `normalized_options` guarda oferta canonical.
- `shortlists` y `shortlist_items` preservan ranking/contexto.
- `cart_items` modela selección explícita.
- `quote_bundles` y `bundle_items` modelan review/export state.
- `quote_exports` versiona el artefacto shareable.

### Logs, trazabilidad y evaluaciones
- `audit_events` es la línea oficial de trazabilidad funcional.
- `llm_runs` y `tool_runs` permiten costo, latencia y debugging.
- `fallback_events` y `exception_cases` soportan QA y operaciones.
- `eval_runs` y `eval_cases` sostienen regresión AI y release gates.

### Usuarios, agencias y organizaciones
- V1: ownership por operador.
- `agency_name` se guarda en sesión porque es metadato operativo del caso.
- Si la operación real necesita estructura multiagencia luego, se agrega `organizations` y `memberships` sin reescribir el quote domain.

### Prompt/config versioning
- `prompt_versions` con `prompt_key`, `version`, `status`, `vendor_target`, `notes`.
- `tenant_supplier_config` con currency, source market, language y toggles por servicio.
- Toda ejecución guarda referencias de versión de prompt y config.

## 11. Seguridad y Governance
### Autenticación y autorización
- Login-only con usuarios provisionados externamente.
- Supabase Auth con MFA opcional en staging/prod si la operación lo soporta.
- RLS por ownership de `quote_session`.
- Mutaciones sensibles solo por backend/service role.

### Secretos y acceso a proveedores
- Secretos en Vercel/Supabase env vars; no en código, no en Notion.
- Rotación documentada y env-scoped.
- Hotelbeds credentials separadas por ambiente.
- OpenAI API keys separadas por ambiente y con projects/cost caps independientes.

### Separación de ambientes
- `local`, `dev`, `staging`, `prod` con proyectos Supabase distintos.
- Vercel preview aislado de producción.
- Supplier sandbox/test credentials en dev/staging; prod solo con credenciales productivas.

### Auditabilidad y protección de datos
- `command_id`, `trace_id`, `actor_id` y `session_version` en toda mutación.
- PDFs y exports con bucket protegido por ownership.
- No logs con secretos, PANs o datos sensibles innecesarios.
- Los exports no deben contener flags internos de operador.

### Prompt injection y tool misuse
- User content tratado como no confiable.
- Tool calls siempre pasan por schema validation.
- System prompt prohíbe cambiar políticas por instrucciones del usuario.
- No tool web/internet en runtime del agente.
- Supplier queries se arman desde campos estructurados, no desde texto libre sin validar.

### Validación de inputs y límites del agente
- Validación Zod-equivalente en BFF, backend y adapters.
- Comandos no válidos por estado devuelven `no-op` o `error` tipado, no comportamiento implícito.
- Soporte-depth classifier corre antes de packaging final en casos de riesgo.
- Rate limiting y session budgets evitan loops o abuso.

### Revisión humana
- Export siempre es acción explícita del operador.
- Casos `Level C`, `unsupported_scope`, `concierge-like`, `managed travel`, grupos grandes y garantías no soportadas deben escalar.
- AppSec revisa threat model antes de staging; QA/Evals y Engineering Lead firman RC.

## 12. Testing Strategy
### Unit tests
- Qué: validators, classifiers, state transitions, pricing/tax rules, stale logic, blocker predicates, prompt assemblers puros.
- Cuándo: en cada PR.
- Criterio: rápidos, deterministas, cobertura alta en dominio core.
- Fallo crítico: permitir search sin bloqueantes, bypass de stale/export blockers, transición inválida.

### Integration tests
- Qué: command handlers con DB, snapshots, memory facts, audit events, BFF->backend flows.
- Cuándo: cada merge a main y antes de staging.
- Criterio: casos felices y fallbacks principales por servicio.
- Fallo crítico: command envelope inconsistente, idempotencia rota, RLS bypass.

### Contract tests
- Qué: schemas I/O de orquestación, adapters Hotelbeds, normalization contracts, PDF input schema.
- Cuándo: cada cambio de adapter o tipos públicos.
- Criterio: fixtures versionados y pactos rotos bloquean merge.
- Fallo crítico: normalized option inválido, mapping roto, tax handling inconsistente.

### E2E browser
- Qué: login, nuevo quote, clarificación, shortlist, compare, cart, bundle, export, archive/restore, requote.
- Cuándo: nightly y gate de staging.
- Criterio: rutas críticas cubiertas y estables.
- Fallo crítico: operador no puede cerrar quote core, resumen del hilo inexistente, export roto.

### AI evals
- Qué: request understanding, clarification relevance, question economy, recommendation usefulness, caveat honesty, escalation choice, packaging clarity.
- Cuándo: en cada cambio de prompt, model routing o business rules.
- Criterio: umbrales por dimensión y cero fallos fatales.
- Fallo crítico: hallucinated supplier content, no clarifica bloqueantes, oculta limitaciones materiales.

### Scenario testing
- Qué: familia estándar, niños sin edades, grupo 10+, premium in-scope, concierge out-of-scope, activities missing, mixed currency, stale bundle.
- Cuándo: staging y release candidate.
- Criterio: escenarios PMOS gold set.
- Fallo crítico: tratar out-of-scope como success normal.

### Fallback testing
- Qué: no_results, weak_results, supplier timeout, partial quote, resume archived thread, contradictory request.
- Cuándo: integración y E2E.
- Criterio: siguiente paso útil visible y continuidad preservada.
- Fallo crítico: silencios, reset del hilo, falsa completitud.

### Regression tests
- Qué: core state machine, prompt behavior, PDF fields, mappings, versioning.
- Cuándo: cada release y nightly.
- Criterio: baseline estable por commit/tag.
- Fallo crítico: versión activa incorrecta, regressions de SLA o evals.

### Smoke tests y staging validation
- Qué: login, supplier connectivity, command execution, PDF generation, event logging.
- Cuándo: post-deploy a staging/prod.
- Criterio: check rápido con datos controlados.
- Fallo crítico: deploy sin supplier path o sin audit path.

## 13. Evals para el Sistema AI
### Dimensiones a medir
- `readiness_correctness`
- `clarification_relevance`
- `question_economy`
- `request_understanding`
- `recommendation_usefulness`
- `tradeoff_clarity`
- `caveat_honesty`
- `support_depth_compliance`
- `partial_quote_honesty`
- `escalation_appropriateness`
- `shareable_packaging_quality`

### Cómo evaluar claridad y utilidad
- Claridad: judge rubric + reviewer humano con scoring de 1 a 5 y check de “¿el operador sabe qué hacer ahora?”.
- Utilidad: “¿podría el agente compartir o defender esta salida sin rearmarla sustancialmente?”.
- Manejo de faltantes: medir si preguntó lo mínimo y correcto antes de buscar.
- Consistencia: mismas entradas deben producir misma decisión de modo, estados y estructura, aunque el wording varíe.
- Comparabilidad: en `three_options`, las opciones deben diferenciarse por tradeoff real, no por parafraseo.
- Ambigüedad: medir si detecta contradicción y pide prioridad, no si improvisa.

### Dataset / casos de prueba
- Gold set de PMOS: `FAM`, `GRP`, `LUX`, `COR`, `CRT`, `WS`, `SAF`.
- Casos reales anonimizados del piloto.
- Casos sintéticos adversariales: mensajes largos copiados, datos contradictorios, requests incompletos, supplier weakness.
- Fixtures por servicio y por mezcla de categorías.

### Capacidad vs regresión
- `Capability evals`: benchmark amplio por feature y edge cases, usado al introducir capacidades nuevas.
- `Regression evals`: subset pequeño, estable y frecuente, usado en cada PR/merge que toque prompts, ranking o flows.
- `Trajectory evals`: revisan si la secuencia de nodos y tools fue correcta, no solo el output final.

### Involucramiento humano
- Travel ops revisa muestras semanales de outputs.
- Engineering/QA revisa trayectorias fallidas.
- Cada release candidate incluye sesión de calibration de rubrics.
- Advisory failures no bloquean release; fatal failures sí.

## 14. Observabilidad y Operación
### Logs
- Logs estructurados JSON.
- Campos mínimos: `timestamp`, `trace_id`, `quote_session_id`, `command_id`, `actor_id`, `service_line`, `supplier`, `model`, `prompt_version`, `latency_ms`, `status`.
- No loggear secrets ni payloads sensibles completos.

### Traces
- Correlation ID desde navegador hasta proveedor.
- OTel en web/BFF y cualquier servicio Node.
- En Edge Functions, si OTel completo no es práctico, se emiten logs + audit events con el mismo `trace_id`.

### Métricas
- `time_to_first_viable_shortlist`
- `time_to_export_ready`
- `bundle_refresh_latency`
- `pdf_generation_latency`
- `supplier_error_rate`
- `fallback_rate`
- `weak_shortlist_rate`
- `escalation_rate`
- `token_cost_per_quote`
- `tool_calls_per_quote`
- `stale_export_block_rate`

### Dashboards y alertas
- Dashboard operativo: throughput, latencia, errores, costs, fallbacks.
- Dashboard de calidad: eval scores, weak shortlists, escalations, export blocks.
- Dashboard supplier: tiempo por API, no_results, timeouts, auth errors.
- Alertas: burn-rate para fallos de command API, PDF failures, supplier auth/signature errors, export blocker bypass, spike de hallucination/adversarial failures.

### Monitoreo de calidad del agente
- Muestra diaria/weekly de outputs.
- Monitoreo de drift por prompt/model version.
- Tablero de fallos fatales y advisory por scenario family.

### Monitoreo de integraciones y experiencia
- Health checks no solo HTTP; también synthetic quote journeys.
- Session replay opcional solo en staging o con sanitización fuerte.
- UX metrics: thread resume success, compare usage, requote recovery rate.

### Operación
- Runbooks para supplier incident, AI degradation, export failures y DB migration issues.
- On-call ligero en staging/prod durante piloto.
- Release markers en dashboards por deploy.

## 15. CI/CD y Ambientes
### Local
- `pnpm install`, `supabase start`, `.env.local`, seed fixtures, mocked supplier mode.
- Developer bootstrap script y test data pack.
- Feature flags locales.

### Dev
- PR preview en Vercel.
- Supabase dev aislado.
- Supplier mock o sandbox según disponibilidad.
- Evals rápidas y Playwright smoke.

### Staging
- Ambiente largo de pre-release.
- Custom environment de Vercel.
- Supabase staging.
- Hotelbeds test account/sandbox.
- Dataset estable para rehearsals y QA.

### Production
- Vercel prod.
- Supabase prod.
- Credenciales productivas y presupuestos de AI separados.
- Feature flags conservadoras y gradual enablement por cohort interna.

### Branching strategy
- Trunk-based.
- `main` protegido.
- Feature branches cortas.
- `release/*` solo si el piloto exige branch de hardening.
- Cambios de prompt/version tratados como código y pasan por PR.

### PR checks
- typecheck
- lint/format check
- unit tests
- contract tests
- migration validation
- secret scan
- dependency vulnerability scan
- AI regression subset
- Playwright smoke si toca UI crítica

### Test gates
- `main`: unit + contract + integration subset + AI regression subset.
- `staging`: full integration + E2E crítico + AI regression full + export safety.
- `prod`: smoke post-deploy + health journey.

### Build pipeline
- Cache por Turborepo.
- Artefactos reproducibles.
- Deploy web y functions coordinados.
- Migrations aplicadas primero a dev/staging; prod con aprobación manual.

### Secret management
- Vercel envs, Supabase secrets, GitHub OIDC/secret store.
- Nada de static secrets en CI files.
- Rotación documentada.
- Acceso mínimo por ambiente.

### Deploy y rollback
- Preview auto por PR.
- Promote manual a staging.
- Producción con aprobación de Engineering Lead + QA/Evals.
- Rollback web por Vercel.
- Rollback functions por versión previa.
- DB usa `expand-and-contract`; rollback preferido es `forward fix`, no revert ciego.

### Release process
- Checklist de release.
- Freeze corto de prompts y migrations antes de RC.
- Rehearsal en staging.
- Pilot cohort enablement.
- Post-release review 24h/72h.

## 16. Notion / Operating Model del Equipo de Ingeniería
### Bases de datos
- `Initiatives`
- `Engineering Workstreams / Epics`
- `Stories / Tasks`
- `Bugs / Incidents`
- `Architecture Decisions`
- `Risks & Dependencies`
- `Artifacts`
- `QA & Evals Runs`
- `Releases`
- `Requirement Traceability`

### Vistas
- `Ready for Engineering`
- `Current Wave`
- `Blocked by Supplier`
- `Open Decisions`
- `Prompt / Model Changes`
- `Staging Gate`
- `Pilot Issues`
- `Release Readiness`
- `AI Eval Regressions`

### Estado de iniciativas y backlog
- Initiative state: `Definition Approved`, `Architecture Locked`, `Build In Progress`, `Pilot`, `Hardening`, `Released`.
- Stories deben mapear a `PRD IDs`, `RF`, `AC`, `risk`, `owner`, `environment`.
- Bugs separados en `product`, `integration`, `AI behavior`, `infra`, `PDF/export`, `security`.

### Decisions, mapping y risks
- ADRs y decisiones operativas vinculadas a workstreams.
- `Requirement Traceability` debe mapear `RF -> Epic -> Tasks -> Tests -> Evals -> Release`.
- `Risks & Dependencies` debe distinguir `product`, `integration`, `infra`, `data/evals`, `security`.

### QA / evals tracking y release tracking
- `QA & Evals Runs` con `run type`, `dataset`, `model version`, `prompt version`, `status`, `fatal count`.
- `Releases` con checklist, staging rehearsal, go/no-go, rollback outcome, post-release issues.

### Regla de gobierno
- Notion es source of truth para trabajo activo.
- Repo PMOS/local sigue siendo fuente canónica de artefactos.
- No copiar cuerpos completos si no hace falta; usar structured summary + enlace al artefacto canon.

## 17. Roadmap de Implementación
### Fase 0
Objetivo: cerrar traducción PMOS -> ingeniería.
Desbloquea: backlog técnico y stack lock.
Entrega: blueprint, ADRs, traceability matrix.
No resuelve todavía: código productivo.

### Fase 1
Objetivo: foundation platform + shell.
Desbloquea: desarrollo paralelo frontend/backend.
Entrega: repo, auth, workspace, historial.
No resuelve todavía: Hotelbeds real ni AI full flow.

### Fase 2
Objetivo: quote spine con hoteles-first vertical slice.
Desbloquea: validación del patrón command/state.
Entrega: intake, clarify, hotel search, shortlist, cart base.
No resuelve todavía: bundle multicategoría completo.

### Fase 3
Objetivo: transfers + activities + multi-service packaging.
Desbloquea: circuito/paquete real.
Entrega: adapters multi-service, fan-out, partial fallback.
No resuelve todavía: hardening completo.

### Fase 4
Objetivo: bundle review, PDF, versionado, requote resiliente.
Desbloquea: piloto interno con artefacto shareable.
Entrega: export, stale logic, version activa.
No resuelve todavía: optimización de costos y colaboración multioperador.

### Fase 5
Objetivo: evals, observabilidad, seguridad, staging rigor.
Desbloquea: release candidate.
Entrega: gates, dashboards, alertas, runbooks.
No resuelve todavía: expansión funcional.

### Fase 6
Objetivo: piloto y hardening final.
Desbloquea: operación inicial seria.
Entrega: cohort piloto, fixes, training, backlog fase 2.
No resuelve todavía: booking, margin governance, multi-provider, STT amplio.

## 18. Dependency Map
### Dependencias técnicas
- Repo de ingeniería separado y configurado.
- Supabase por ambiente.
- Vercel con preview/staging/prod.
- GitHub Actions y branch protection.
- Servicio Node para PDF.

### Dependencias de producto
- PRD v03 aprobado.
- Acceptance criteria y fallback strategy aprobados.
- Taxonomía de estado comercial cerrada.
- Política de visibilidad cliente vs operador cerrada.
- Política de pricing/tax fase 1 cerrada.

### Dependencias de integración
- Credenciales Hotelbeds por ambiente.
- Defaults tenant confirmados.
- Mappings de destinos/orígenes/hoteles.
- Decisión final de activities execution path.
- Rate/recheck policy real de cuenta.

### Dependencias de infraestructura
- Dominios, DNS, storage buckets.
- Secrets y OIDC.
- Entornos de staging/prod.
- Monitoring sink y budgets.

### Dependencias de data / evals
- Gold set inicial.
- Fixtures supplier.
- Rubrics calibradas.
- Owners de revisión humana.
- Event schema estable para dashboards.

## 19. Riesgos Críticos del Programa
1. Mismatch con cuenta Hotelbeds real. Impacto: muy alto. Probabilidad: alta. Mitigación: fase dedicada de tenant validation, adapter contract tests con sandbox real, no cerrar mappings por intuición.
2. Anchor resolution subestimado. Impacto: muy alto. Probabilidad: alta. Mitigación: tratar mappings como subsistema, no helper; backlog específico y tests de resolución.
3. Chat demasiado largo rompe SLA. Impacto: alto. Probabilidad: media-alta. Mitigación: context package por capas, límite de aclaraciones, summary rail, no transcript full replay.
4. Activities genera falsa promesa de completitud. Impacto: alto. Probabilidad: alta. Mitigación: partial-quote policy, weak/partial disclosure, tests específicos y copy honesto.
5. Acoplamiento a payloads raw Hotelbeds. Impacto: alto. Probabilidad: media. Mitigación: canonical quote domain, adapters tipados, no exponer supplier schema a UI ni prompts.
6. Requote invalida bundle sin visibilidad clara. Impacto: alto. Probabilidad: media. Mitigación: stale states, delta view, export blockers, regression tests.
7. Calidad AI se evalúa solo por fluidez. Impacto: alto. Probabilidad: media-alta. Mitigación: deterministic + AI evals + trajectory review + human review.
8. Seguridad blanda en tool calling y secretos. Impacto: alto. Probabilidad: media. Mitigación: tool whitelists, schema validation, RLS, secret isolation, threat model.
9. Mezcla de precios/taxes confunde al cliente. Impacto: medio-alto. Probabilidad: media. Mitigación: source price model, visibility policy, blocked-export rules.
10. El equipo abre scope hacia booking o multi-proveedor. Impacto: alto. Probabilidad: media. Mitigación: release scope gates, ADRs, roadmap explícito y backlog por fase.

## 20. Decisions Needed Before Coding
- Aprobar repo y ownership de ingeniería separados del PMOS. Default propuesto: sí.
- Aprobar stack base `Next.js + Supabase + Vercel` con `Cloudflare` solo como escala posterior. Default propuesto: sí.
- Aprobar vendor AI inicial OpenAI con runtime single-vendor y benchmark offline multi-vendor. Default propuesto: sí.
- Confirmar que `speech-to-text` sale del release base y se deja en `Phase 1B`. Default propuesto: sí.
- Confirmar copy comercial/legal mínimo de disclaimers. Default propuesto: usar wording de dynamic pricing, taxes no incluidos y recomendación de pago en 72h.
- Confirmar retención de datos. Default propuesto: 365 días para sesiones/exports y 30 días para logs raw de debug.
- Confirmar si password reset entra como utilidad operativa o se maneja fuera del producto. Default propuesto: habilitar reset básico si no retrasa el release; no hacerlo criterio de aceptación.
- Confirmar prioridad de KPI del piloto. Default propuesto: 1) velocidad útil, 2) consistencia del quote, 3) recovery/requote, 4) soporte a conversión; margen fuera de fase 1.
- Confirmar defaults Hotelbeds por ambiente. Default propuesto: bloquear build de staging/prod hasta tenerlos.
- Confirmar ruta de activities. Default propuesto: `search-first` para discovery y `availability/revalidation` antes de packaging final cuando pricing precise.
- Confirmar herramienta de dashboards. Default propuesto: Sentry + dashboards SQL operativos; no sumar plataforma BI extra antes del piloto.
- Confirmar inclusión de pilot cohort y owners de revisión humana. Default propuesto: sí, con travel ops + QA/Evals.

## 21. Trazabilidad y Fuentes
### PMOS / Notion
- [AI-TRAVEL-PMOS](https://www.notion.so/31dd9667872880039ac3f8009c74c6f7)
- [Alana - hotelbeds - AI](https://www.notion.so/31bd966787288000b2a7ea0a61d6e558)
- [30 - Product Requirements Document v1](https://www.notion.so/31cd96678728813581edda787dd8d01c)
- [41 - Arquitectura Ejecutable v1](https://www.notion.so/31cd9667872881638fbfc24efdba5635)
- [42 - Arquitectura Detallada v1](https://www.notion.so/31cd966787288170a951fe3cba832f28)
- [43 - Supabase Data Model v1](https://www.notion.so/31cd9667872881468b43f78f13ce5830)
- [44 - Arquitectura de Chat y Memoria v1](https://www.notion.so/31cd96678728814b8050e1217b6c86f2)
- [51 - Orchestration State Machine v1](https://www.notion.so/31cd966787288164ac39e5210797a9fd)
- [55 - Command and Audit Event Model v1](https://www.notion.so/31cd9667872881fdba24eb3a96e1b309)
- [28 - Quote Quality Evaluation Baseline v1](https://www.notion.so/31bd9667872881ddb376d956baf201ca)

### Fuentes oficiales recientes consultadas
- [OpenAI Responses API docs](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Prompt Management](https://platform.openai.com/docs/guides/text?api-mode=responses)
- [OpenAI Evals Design Guide](https://platform.openai.com/docs/guides/evals-design)
- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Next.js Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Supabase Edge Functions Overview](https://supabase.com/docs/guides/functions)
- [Supabase Background Workers / Background Tasks](https://supabase.com/docs/guides/background-workers)
- [Vercel Environments](https://vercel.com/docs/deployments/environments)
- [Vercel Custom Environments](https://vercel.com/docs/deployments/custom-environments)
- [Hotelbeds Hotels Workflow](https://developer.hotelbeds.com/documentation/hotels/booking-api/workflow/)
- [Hotelbeds Transfers Availability](https://developer.hotelbeds.com/documentation/transfers/booking-api/search-availability/availability-simple/)
- [Hotelbeds Activities Availability Search](https://developer.hotelbeds.com/documentation/activities/booking-api/availability-search/search/)
