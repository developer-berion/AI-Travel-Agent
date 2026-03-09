# Hybrid Skill Sync Model

## Purpose

Define how Alana should work with:

- PMOS documents,
- implementation documents and code,
- generic Codex skills,
- and project-specific Codex skills.

The goal is synchronization without duplication and without PM drift inside an engineering repo.

The intended model is:

- PMOS as upstream product knowledge
- this repo as expert engineering knowledge and execution

## The four layers

### 1. Engineering repo layer

Path:

- `C:/Users/victo/Berion Company Projects/AI - Engineering OS - Alana`

Owns by default:

- code
- implementation architecture
- migrations
- tests and eval harnesses
- CI/CD
- runtime and deployment details
- engineering execution sequencing
- engineering methods and implementation strategy across frontend, backend, AI, integration, quality, and operations

This is the default operating layer for the repo.

### 2. PMOS layer

Path:

- `C:/Users/victo/Berion Company Projects/AI-TRAVEL-PMOS`

Owns:

- product scope
- product phase and gates
- acceptance criteria
- risk framing
- open questions
- formal product decisions

This layer is consulted when implementation touches product meaning.

It is an upstream contract and knowledge base, not the daily center of technical decision-making here.

### 3. Generic Codex skill layer

Path:

- `C:/Users/victo/.codex/skills`

Owns reusable specialist workflows such as:

- orchestration
- Hotelbeds integration
- evals
- observability
- CI/CD
- documentation and PMO support

These skills are reusable support. They are not product truth.

In this repo, they are primarily used as engineering specialists.

### 4. Project-specific Codex skill layer

Path:

- `C:/Users/victo/.codex/skills/alana-engineering-router`
- `C:/Users/victo/.codex/skills/alana-engineering-executor`
- `C:/Users/victo/.codex/skills/alana-engineering-sync`

Owns:

- routing Codex to the right layer
- telling Codex which artifacts to inspect first
- preserving the PMOS -> engineering -> execution relationship

These skills must stay small and procedural. They must not become a second PMOS.

## Precedence rules

1. The engineering repo is the default operating layer.
2. PMOS wins only on product meaning and approved behavior.
3. Generic skills provide methods, not authority.
4. Project-specific skills provide routing, not business truth.

### Knowledge rule

- PMOS mostly informs what and why.
- This repo mostly decides how.

## Synchronization rules

### Update PMOS when the change affects:

- scope
- supported versus unsupported behavior
- acceptance criteria
- phase readiness
- operator workflow intent
- supplier assumptions that change product behavior

### Update the engineering repo when the change affects:

- code or architecture
- local contracts and APIs
- migrations
- tests, evals, CI/CD, observability
- build and runtime operations

### Update project-specific skills when:

- a recurring workflow should be encoded for future sessions
- the document-routing logic changed
- the hybrid operating model changed

Do not update skills just because project status changed temporarily.

## Default operating flow

1. Use `alana-engineering-router`.
2. Stay in the engineering layer unless product-boundary impact is real.
3. Activate the minimum generic specialist skill set for the engineering problem at hand.
4. Execute the work.
5. If the change is material, use `alana-engineering-sync`.

## Anti-patterns

- starting every technical task from PMOS
- duplicating PMOS docs inside skills
- duplicating engineering docs inside PMOS
- encoding fast-changing project status inside skills
- letting a support skill overrule the PMOS
- letting code silently redefine product scope

## Practical note

New skills installed under `~/.codex/skills` typically require a Codex restart before future sessions auto-discover them cleanly.
