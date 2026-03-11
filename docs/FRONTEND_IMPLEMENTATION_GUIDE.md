# FRONTEND IMPLEMENTATION GUIDE

## Status

Antigravity is the active frontend authority for the operator workbench.

This guide supersedes the previous visual direction and is the default reference
for implementation, QA, and future frontend changes in this repo.

## Non-negotiables

- Preserve routes, backend APIs, domain contracts, persistence, and command
  behavior unless a separate engineering change explicitly approves otherwise.
- Keep operator-facing copy in Spanish across the workbench.
- Do not surface raw enums, snake_case values, contract codes, storage paths, or
  runtime implementation details in operator mode.
- Desktop and tablet are the primary surfaces. Mobile is a reduced companion for
  access, reading, and minimal continuity actions.
- Dark mode remains first-class and must preserve hierarchy and legibility.

## Visual Foundation

- Typography: `Inter` as the primary family via `next/font/google`.
- Tokens and layout primitives live in
  `apps/web/app/globals.css`.
- Antigravity uses a soft lilac/pastel foundation, restrained semantic colors,
  rounded cards, low-noise shadows, and clear contrast in both light and dark
  themes.
- Interaction hierarchy is driven by layout, spacing, and grouped surfaces
  rather than technical badges or stacked banners.

## Presentation Contract

The presentation normalization layer lives in
`apps/web/lib/presentation.ts`.

Use this layer whenever UI code needs to render:

- localized labels for quote state, recommendation mode, service lines, and
  commercial status
- visible coverage/continuity messaging
- current-action framing for the sticky session header
- operator-facing dates and timestamps
- normalized visible error messages
- translation for compare rows, card eyebrows, and action chips

Do not render domain enums or backend error ids directly from components.

## Shell And Hierarchy

- `apps/web/app/(workspace)/layout.tsx` owns the Antigravity topbar.
- Environment/runtime diagnostics must stay behind the secondary `Entorno`
  details panel and out of the primary operator hierarchy.
- `apps/web/app/(workspace)/quotes/[quoteSessionId]/layout.tsx` owns the single
  sticky workbench module for state, continuity, version, and next action.
- Do not reintroduce parallel banners for the same case state inside child
  surfaces.

## Surface Rules

### Auth

- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/components/workbench/login-form.tsx`

Use Antigravity copy and layout while preserving the current auth mechanism.

### Workspace / Inbox

- `apps/web/app/(workspace)/quotes/page.tsx`
- `apps/web/components/workbench/workspace-inbox.tsx`
- `apps/web/components/workbench/session-sidebar.tsx`

Required behavior:

- grouped operator inbox in Spanish
- empty groups collapsed
- quick preview without redundant metadata
- archive controls visible but not dominant

### Conversation

- `apps/web/app/(workspace)/quotes/[quoteSessionId]/conversation/page.tsx`
- `apps/web/components/chat/message-composer.tsx`

Required behavior:

- no duplicate thread header + summary banner stack
- continuity card only when resume context exists
- transcript visually subordinate to continuity when a case is resumed
- humanized conversation blocks with translated eyebrows and actions
- no contract codes or other technical ids in operator-visible copy

### Case Sheet

- `apps/web/app/(workspace)/quotes/[quoteSessionId]/case/page.tsx`
- `apps/web/components/quote/operator-notes-panel.tsx`

Required behavior:

- cleaner operational snapshot
- internal notes clearly marked as operator-only
- internal notes never leak into share/export/PDF surfaces

### Quote Review

- `apps/web/app/(workspace)/quotes/[quoteSessionId]/quote/page.tsx`
- `apps/web/components/quote/active-quote-review.tsx`
- `apps/web/components/quote/compare-tray.tsx`
- `apps/web/components/quote/shortlist-card.tsx`

Required behavior:

- commercial review first, operator detail second
- compare matrix localized and structured by top vs secondary criteria
- service lines rendered as human labels, never raw ids

### Versions

- `apps/web/app/(workspace)/quotes/[quoteSessionId]/versions/page.tsx`
- `apps/web/components/quote/quote-versions-panel.tsx`

Required behavior:

- timeline in Spanish
- active vs historical versions clearly separated
- diff framed as operator-readable deltas
- re-quote action available only on non-active versions

### Export

- `apps/web/app/(workspace)/quotes/[quoteSessionId]/export/[exportId]/page.tsx`
- `apps/web/components/quote/export-quote-button.tsx`

Required behavior:

- frozen export review aligned to the active quote presentation
- no `storagePath` or backend metadata in operator-facing UI
- PDF download preserved

## Responsive Contract

- Desktop: full workbench
- Tablet: full workbench with tighter wrapping
- Mobile: reduced companion; preserve reading, continuity, and minimal actions
- Avoid restoring desktop-only density patterns on narrow screens

## Accessibility Contract

- visible focus states in both themes
- meaningful button/link names in Spanish
- no information encoded only through color
- details/summary and navigation labels must remain legible for keyboard users

## Validation

Automated baseline:

- `apps/web/e2e/workspace-smoke.spec.ts`
- relevant component/unit tests already covering database/orchestration view
  builders

Manual validation must confirm:

- login
- workspace triage
- blocked intake
- partial/no results
- quote review + internal notes isolation
- compare
- versions
- archive/reactivate/resume
- export/PDF
- light/dark on desktop/tablet and reduced mobile companion

## Implementation Rule

When a new UI change conflicts with the previous frontend guide, Antigravity wins.
Only PMOS-approved scope or behavior changes can override this guide, and those
must be surfaced explicitly.
