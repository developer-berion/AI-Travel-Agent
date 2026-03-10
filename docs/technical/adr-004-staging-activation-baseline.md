# ADR-004 Staging Activation Baseline

- Fecha: 2026-03-09
- Estado: Accepted

## Contexto

La baseline de fundacion ya estaba implementada, pero faltaba activar un `staging real` sobre los servicios hosted existentes.

El objetivo de esta pasada fue mover el sistema desde un baseline puramente local/mock hacia un staging usable para validacion interna sin abrir aun la wave de proveedor real (`Hotelbeds`) ni la wave final de `production`.

Los proyectos hosted existentes fijados para esta etapa son:

- GitHub: `developer-berion/AI-Travel-Agent`
- Supabase: `uaqzreazqxhseyriulbt`
- Vercel: `alana-ai-agent`

## Decision

- `Supabase` queda enlazado localmente al proyecto `uaqzreazqxhseyriulbt`.
- Las migraciones `20260309150000_initial_quote_os_schema.sql` y `20260309183000_auth_and_rls_baseline.sql` se aplican en staging.
- `Supabase Auth` se configura en modo `invite-only`: signup publico bloqueado, email/password login habilitado para usuarios provisionados y redirects alineados al URL canonico actual `https://alana-ai-agent.vercel.app`.
- `Vercel` queda configurado con `rootDirectory=apps/web`, `framework=nextjs` y `nodeVersion=22.x`.
- El proyecto hosted actual se trata como `staging canonical URL` mientras no exista un proyecto separado de produccion.
- Los envs de hosted quedan activados para `supabase` y `openai` en el target `production` del proyecto Vercel actual, que en esta etapa funciona como staging canonico.
- El deploy de staging se valida con deployment manual `sourceless` porque el deploy directo desde el repo local quedo bloqueado por metadata Git del autor y la integracion Git aun apunta al repo historico.

## Consecuencias

- El staging actual ya soporta login real con `Supabase Auth`, persistencia real en `Postgres` y ownership por operador.
- Se valido en hosted la cadena `login -> create quote -> append operator message`, generando `operator_profiles`, `quote_sessions`, `quote_messages` y `audit_events` en staging.
- Se valido `OpenAI Responses API` en staging con `gpt-5-mini`; el evento `intake_extracted` persiste `openai_response_id` en `audit_events`.
- El primer admin de staging fue invitado a `victor@alanatours.com`.
- El repo canonico `developer-berion/AI-Travel-Agent` ahora es publico y `main` quedo protegida con PR obligatorio y checks requeridos.
- `Vercel Git integration` no quedo conectada al repo canonico; el proyecto actual sigue sin Git repository asociado y se mantiene con deploy manual hasta resolver esa integracion en Vercel.
- El siguiente slice tecnico ya no es `OpenAI staging activation`; es `Hotelbeds staging integration`.
