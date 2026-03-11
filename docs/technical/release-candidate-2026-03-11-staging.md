# Release Candidate - 2026-03-11

## Scope

- Release branch: `codex/bundle-review-staging-persistence`
- Target environment: `staging`
- Canonical URL: `https://alana-ai-agent.vercel.app`
- Candidate includes the full branch payload, not only Antigravity/UI

## Main changes

- Antigravity becomes the active operator-facing visual system for the web workbench.
- Conversation, inbox, quote review, export, and versions now use localized operator copy in Spanish.
- The quote session shell now consolidates continuity, state, version, and next action into a single sticky header.
- Compare, export, and version review surfaces now hide raw technical strings from operator-facing views.
- Operator notes, active quote versions, export flows, and related persistence/runtime paths are included in this candidate.

## Migrations included

- `20260310163000_quote_exports_storage.sql`
- `20260310190000_operator_notes_and_quote_versions.sql`

Required migration head for this candidate:

- `20260310190000_operator_notes_and_quote_versions.sql`

## Commands validated locally

```bash
pnpm check
pnpm build
pnpm --filter @alana/web test:e2e e2e/workspace-smoke.spec.ts
```

## Hosted staging checklist

- Update Vercel envs:
  - `ALANA_RUNTIME_GIT_SHA`
  - `ALANA_RUNTIME_BUILD_AT`
  - `ALANA_RUNTIME_MIGRATION_HEAD`
- Manual deploy the exact candidate commit to `alana-ai-agent`
- Verify `GET /api/runtime-sync`
- Export:

```bash
$env:RELEASE_CANDIDATE_GIT_SHA="<sha>"
$env:RELEASE_CANDIDATE_MIGRATION_HEAD="20260310190000_operator_notes_and_quote_versions.sql"
```

- Run:

```bash
pnpm staging:hotelbeds:smoke
pnpm staging:bundle:smoke
```

## Known risks

- Vercel preview deployments triggered by Git can still be canceled if the commit is not verified.
- Staging promotion depends on the runtime envs matching the exact release candidate metadata.
- This branch contains multiple subsystems in one package, so rollback should be done at deployment level, not piecemeal.

## PR summary skeleton

### What changed

- Antigravity operator UI rollout across login, workspace, conversation, quote, export, and versions
- localized presentation layer for visible labels, actions, dates, and command errors
- operator notes + quote version persistence and supporting command/runtime updates
- smoke coverage refreshed for the new operator-facing hierarchy and copy

### Validation

- `pnpm check`
- `pnpm build`
- `pnpm --filter @alana/web test:e2e e2e/workspace-smoke.spec.ts`
- `pnpm staging:hotelbeds:smoke`
- `pnpm staging:bundle:smoke`

### Risks / follow-up

- staging deploy must use the candidate SHA and migration head reflected in `/api/runtime-sync`
- if hosted smoke fails, keep the PR open and rollback staging before any merge to `main`
