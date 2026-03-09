# AGENTS.md

## Purpose

This repo is the Development OS for the Alana quoting system.

It is an engineering-and-development repo first.

Its job is to design, implement, test, harden, deploy, and operate the system.

Upstream product truth may exist in PMOS, but PMOS is not the default operating layer for day-to-day work in this repo.

PMOS provides the researched product base.

This repo provides the expert engineering layer that turns that base into a real system.

## Source-of-truth hierarchy

1. This repo controls by default:
- code
- implementation ADRs
- migrations
- tests and eval harnesses
- CI/CD and runtime wiring
- engineering execution sequencing
- runtime and deployment behavior
- engineering architecture and implementation trade-offs
- frontend, backend, AI systems, integration, quality, and operations strategy

2. PMOS is upstream and only controls when the task touches:
- scope
- acceptance criteria
- supported and unsupported behavior
- product decisions and open questions

3. Codex skills are support layers:
- generic skills handle reusable specialist work
- project-specific skills route Codex to the correct artifacts

If PMOS and code disagree on product meaning, PMOS wins and the mismatch must be surfaced explicitly.

## Installed project-specific Codex skills

- `alana-engineering-router`
- `alana-engineering-executor`
- `alana-engineering-sync`

## Default activation flow

1. Start with `alana-engineering-router` for any non-trivial task in this repo.
2. Use the minimum specialist support skill needed:
- `ai-orchestration-engineer`
- `hotelbeds-integration-engineer`
- `quote-quality-evaluation-specialist`
- `operator-ux-ui-designer`
- `runtime-observability-auditor`
- `ci-cd-manager`
- `supabase-migration-governor`
- `type-safety-remediation`
- `code-auditor`
3. If the change is material, finish with `alana-engineering-sync`.

## Required first move

Before major planning, implementation, or review, inspect:

- `PLAN.md`
- `docs/technical/engineering-expertise-model.md`
- `docs/technical/hybrid-skill-sync-model.md`
- `docs/technical/traceability-matrix.md`
- relevant ADRs
- PMOS files only if the task may affect scope, acceptance, or approved behavior

## Rules

- Do not turn engineering work into PM ceremony by default.
- Do not copy PMOS into the repo just to make a skill happy.
- Do use the strongest available engineering methods, patterns, and official technical references for implementation decisions.
- Do not let generic Codex skills redefine scope or phase.
- Do not smuggle product decisions through code changes.
- Mark facts, assumptions, proposed decisions, dependencies, and open questions explicitly.
- Keep mock versus real boundaries visible.
