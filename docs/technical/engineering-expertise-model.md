# Engineering Expertise Model

## Purpose

Define what this repo is expected to be expert in.

This repo is not a PMOS clone. It is the engineering and development system for Alana.

## Knowledge split

### PMOS contributes upstream product knowledge

PMOS provides the researched product base:

- product vision
- user and operator context
- problem framing
- scope and out-of-scope boundaries
- flows and acceptance expectations
- discovered risks, assumptions, and open questions

That knowledge informs this repo.

### This repo contributes expert engineering knowledge

This repo must be expert in how to turn that product base into a working system.

Its expert layer includes:

- modern frontend architecture with Next.js App Router
- backend application services and command-driven systems
- conversational AI systems and workflow-first agent design
- tool calling, typed state transitions, and memory policy
- Hotelbeds integration architecture and supplier isolation
- persistence, auth, sessions, and auditability
- testing, evals, and release-quality systems
- observability, operations, CI/CD, rollback, and runtime hardening
- security, limits, and safe integration behavior

## Core rule

PMOS answers mainly:

- what product should exist
- what behavior is approved
- what constraints and acceptance rules matter

This repo answers mainly:

- how the system should be designed
- how it should be implemented
- how it should be tested
- how it should be deployed and operated
- how engineering trade-offs should be made

## Engineering-first decision posture

For day-to-day work in this repo:

1. Start from the engineering problem.
2. Use specialist engineering skills and official technical sources.
3. Consult PMOS only when product meaning or acceptance might change.
4. Encode repeatable engineering workflows in project-specific skills when useful.

## Specialist domains expected here

### Frontend

- operator-facing workbench UX
- server/client boundaries
- rendering strategy
- performance
- accessibility
- streaming and error states

### Backend and architecture

- application services
- orchestration boundaries
- typed contracts
- idempotency
- background job strategy
- data flows

### AI systems

- orchestration patterns
- prompts and tool governance
- memory boundaries
- fallback behavior
- eval design
- cost and latency trade-offs

### Integrations

- supplier adapters
- canonical schemas
- error normalization
- retries and circuit behavior
- future-safe boundaries

### Quality and operations

- deterministic tests
- AI evals
- observability
- release gates
- incident readiness
- rollback and deployment safety

## Practical implication for skills

Project-specific skills in Codex should amplify engineering execution in this repo.

They should:

- route to the right engineering artifacts
- activate the right engineering specialist skills
- keep PMOS in the loop only when needed

They should not:

- restate PMOS documents
- behave like PM operators
- replace engineering judgment with product ceremony
