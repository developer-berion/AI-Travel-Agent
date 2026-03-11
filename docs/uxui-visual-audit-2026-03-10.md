# UXUI Visual Audit - 2026-03-10

## Summary

- Date of audit: 2026-03-10
- Audit mode: local `mock`
- Runtime used: `AUTH_MODE=mock`, `QUOTE_REPOSITORY_MODE=mock`, `AI_PROVIDER=mock`, `HOTELBEDS_PROVIDER=mock`
- Scope reviewed: `login`, `workspace inbox`, `conversation`, `case sheet`, `active quote review`, `compare`, `versions`, `export`, `archive/reactivate`, `error states`, `light/dark`, desktop, tablet, and mobile
- Goal: give UX/UI and Product a visual review package that is specific enough to drive corrections, not just comments

## Executive Summary

The current workbench already proves the workflow shape, but the operator-facing visual layer is still below release quality.

The dominant issues are not isolated to one screen. They repeat across the shell:

1. The system repeats the same context too many times before the operator can act.
2. Copy mixes Spanish and English inside the same surface and sometimes inside the same block.
3. Technical runtime language is visible in places where the operator should only see product language.
4. Responsive collapse is weak. On mobile, the workbench becomes a long stack of cards with poor scanability.
5. Error states are not humanized. A blocked export still shows `quote_command_not_allowed`.

The recommendation for UX/UI and Product is not to tune individual cards first. The first pass should simplify the shell hierarchy, lock the language system, and define a stronger operator density model for desktop and responsive.

## Severity Legend

- `P1`: blocks readability, trust, or action
- `P2`: materially degrades comprehension or speed
- `P3`: inconsistency or debt that should be corrected but is not blocking by itself

## Scenario Evidence Matrix

| ID | Scenario | Surface | Viewport / Theme | Evidence |
| --- | --- | --- | --- | --- |
| `S1` | Empty login + theme toggle | Login | Desktop / light | [login-page.png](./assets/uxui-visual-audit-2026-03-10/login-page.png) |
| `S2` | Empty workspace | Workspace empty state | Desktop / light | [workspace-empty.png](./assets/uxui-visual-audit-2026-03-10/workspace-empty.png) |
| `S3` | New quote in draft | Conversation draft | Desktop / light | [conversation-empty.png](./assets/uxui-visual-audit-2026-03-10/conversation-empty.png) |
| `S4` | Partial quote with blocker + shortlist | Conversation partial | Desktop / light | [conversation-partial.png](./assets/uxui-visual-audit-2026-03-10/conversation-partial.png) |
| `S5` | Compare matrix with two hotels | Compare tray | Desktop / light | [conversation-compare.png](./assets/uxui-visual-audit-2026-03-10/conversation-compare.png) |
| `S6` | Active quote review with caveats | Quote review | Desktop / light | [quote-review.png](./assets/uxui-visual-audit-2026-03-10/quote-review.png) |
| `S7` | Case sheet with internal notes | Case sheet | Desktop / light | [case-sheet.png](./assets/uxui-visual-audit-2026-03-10/case-sheet.png) |
| `S8` | Versions with diff | Versions | Desktop / light | [versions.png](./assets/uxui-visual-audit-2026-03-10/versions.png) |
| `S9` | Archive + reactivate + resume continuity | Conversation resume | Desktop / light | [resume-continuity.png](./assets/uxui-visual-audit-2026-03-10/resume-continuity.png) |
| `S10` | Export happy path | Export review | Desktop / light | [export-happy-path.png](./assets/uxui-visual-audit-2026-03-10/export-happy-path.png) |
| `S11` | Export blocked + error treatment | Quote review error | Desktop / dark | [export-blocked-error.png](./assets/uxui-visual-audit-2026-03-10/export-blocked-error.png) |
| `S12-A` | Responsive full review | Conversation | Mobile 390 / light | [conversation-mobile.png](./assets/uxui-visual-audit-2026-03-10/conversation-mobile.png) |
| `S12-B` | Theme parity spot check | Conversation | Tablet 1024 / dark | [conversation-dark-tablet.png](./assets/uxui-visual-audit-2026-03-10/conversation-dark-tablet.png) |
| `S12-C` | Inbox density review | Workspace inbox | Desktop / light | [workspace-inbox.png](./assets/uxui-visual-audit-2026-03-10/workspace-inbox.png) |

## Findings

### P1 Findings

#### P1-01 Mixed-language operator copy breaks trust and makes the system feel unfinished

- Surfaces: `login`, `workspace shell`, `conversation`, `quote`, `versions`, `export`
- Evidence: [login-page.png](./assets/uxui-visual-audit-2026-03-10/login-page.png), [conversation-partial.png](./assets/uxui-visual-audit-2026-03-10/conversation-partial.png), [quote-review.png](./assets/uxui-visual-audit-2026-03-10/quote-review.png), [versions.png](./assets/uxui-visual-audit-2026-03-10/versions.png)
- Observed:
  - English labels coexist with Spanish body copy on the same screen.
  - State names alternate between English and Spanish: `Draft`, `Reviewing`, `Abierta`, `Export ready`, `Archived`, `Resume continuity`.
  - CTA language also drifts: `Open active quote`, `Review caveats`, `Use as base`, `Enter workspace`, `Archivar`.
- Expected:
  - One locked operator language system across the full workbench.
  - State, CTA, helper copy, and warnings must share the same terminology set.
- Operator impact:
  - Reduces product confidence.
  - Makes the interface feel assembled from internal building blocks instead of a coherent tool.
- Recommendation:
  - Product and UX/UI must lock one operator language before any visual polish pass.
  - Replace mixed labels with a canonical vocabulary set shared by all surfaces.

#### P1-02 Conversation entry is overloaded by repeated summary layers before the operator reaches useful action

- Surfaces: `conversation`, `resume continuity`
- Evidence: [conversation-empty.png](./assets/uxui-visual-audit-2026-03-10/conversation-empty.png), [conversation-partial.png](./assets/uxui-visual-audit-2026-03-10/conversation-partial.png), [resume-continuity.png](./assets/uxui-visual-audit-2026-03-10/resume-continuity.png)
- Observed:
  - The same case summary appears in the workbench header, summary banner, thread header, M-01 card, and again in resume states.
  - On resumed cases, continuity blocks add even more stacked context before the operator gets to the actionable area.
- Expected:
  - The operator should understand status, continuity, and next step in one primary summary layer.
  - Secondary recap should only appear when it adds genuinely new information.
- Operator impact:
  - Slows orientation.
  - Creates fatigue at the top of every thread.
  - Makes the system feel text-heavy even when the actual workflow is simple.
- Recommendation:
  - Fuse `Quote workbench` + `Summary banner` into one primary operating header.
  - Keep `Thread header` only if it adds transcript framing not already visible.
  - Reduce state timeline cards to the minimum set required for the current decision.

#### P1-03 Responsive mobile collapse is not operator-usable

- Surface: `conversation`
- Evidence: [conversation-mobile.png](./assets/uxui-visual-audit-2026-03-10/conversation-mobile.png)
- Observed:
  - Sidebar, shell header, workbench header, tabs, summary, and timeline all stack vertically before the operator reaches the core action zone.
  - Dense cards become long text towers with weak grouping.
  - The screen stops behaving like a workbench and becomes a feed of blocks.
- Expected:
  - Mobile should either provide a deliberate reduced workflow or clearly de-prioritize non-essential surfaces.
  - Primary action and case continuity must remain visible without excessive scrolling.
- Operator impact:
  - Practical scanability collapses.
  - Time to first action becomes too high.
- Recommendation:
  - Define a mobile-specific shell, not just stacked desktop cards.
  - Collapse sidebar to a drawer, compress runtime chrome, and make continuity a single compact module.

#### P1-04 Blocked export exposes raw technical error text

- Surface: `quote review`
- Evidence: [export-blocked-error.png](./assets/uxui-visual-audit-2026-03-10/export-blocked-error.png)
- Observed:
  - The visible error block shows `quote_command_not_allowed`.
  - The error title `Transient visible failure` is also technical and not operator-native.
- Expected:
  - Error language must explain what is blocked, why, and what the operator should do next.
- Operator impact:
  - Breaks trust immediately.
  - Creates the perception of internal system leakage.
- Recommendation:
  - Replace the current error treatment with a humanized block such as:
    - title: `No se puede exportar todavia`
    - body: explain which service or condition is still incomplete
    - action: `Volver al quote` or `Resolver pendiente`

### P2 Findings

#### P2-05 Topbar runtime badges visually compete with product hierarchy

- Surfaces: `workspace`, `conversation`, `quote`
- Evidence: [workspace-empty.png](./assets/uxui-visual-audit-2026-03-10/workspace-empty.png), [workspace-inbox.png](./assets/uxui-visual-audit-2026-03-10/workspace-inbox.png)
- Observed:
  - `Mock auth`, `Mock repository`, and `Mock orchestration` sit in the main header with the same visual family as user-facing metadata.
- Expected:
  - Debug/runtime metadata should live in a subordinate debug strip, drawer, or dev-only panel.
- Operator impact:
  - Pollutes the first visual layer with engineering state.
- Recommendation:
  - Move runtime badges behind a compact `Environment` control or dev-only expandable panel.

#### P2-06 Empty workspace state wastes a large part of the shell with low-value repetition

- Surface: `workspace empty`
- Evidence: [workspace-empty.png](./assets/uxui-visual-audit-2026-03-10/workspace-empty.png)
- Observed:
  - Empty copy appears both in the sidebar and main content with similar weight.
  - The main content leaves a large dead zone after the first card.
- Expected:
  - Empty state should use one primary explanation and one clear CTA.
- Operator impact:
  - Makes the product feel sparse and underdesigned.
- Recommendation:
  - Use one empty-state story and reduce duplicate copy between sidebar and main pane.

#### P2-07 Workspace inbox overweights empty groups and underweights active triage

- Surface: `workspace inbox`
- Evidence: [workspace-inbox.png](./assets/uxui-visual-audit-2026-03-10/workspace-inbox.png)
- Observed:
  - Empty groups such as `Archivadas`, `Cerradas`, `En seguimiento`, and `Compartidas` occupy almost as much visual area as the only active case.
  - The preview column is large while its content is relatively light.
- Expected:
  - Active work should dominate. Empty groups should collapse or visually step back.
- Operator impact:
  - Weakens triage efficiency.
- Recommendation:
  - Collapse empty groups by default.
  - Either shrink the preview panel or increase its information value.

#### P2-08 Timeline cards use too much vertical space for too little differentiation

- Surface: `conversation timeline`
- Evidence: [conversation-partial.png](./assets/uxui-visual-audit-2026-03-10/conversation-partial.png), [resume-continuity.png](./assets/uxui-visual-audit-2026-03-10/resume-continuity.png)
- Observed:
  - The state cards are visually similar even when they represent very different urgency levels.
  - Important and non-important messages consume similar card weight.
- Expected:
  - Blocking clarification, continuity recovery, shortlist ready, and fallback caveat should have visibly distinct hierarchy.
- Operator impact:
  - Harder to know what needs action now.
- Recommendation:
  - Introduce stronger card ranking by urgency and reduce narrative copy length.

#### P2-09 Compare matrix becomes a dense table with weak scan paths

- Surface: `compare`
- Evidence: [conversation-compare.png](./assets/uxui-visual-audit-2026-03-10/conversation-compare.png), [quote-review.png](./assets/uxui-visual-audit-2026-03-10/quote-review.png)
- Observed:
  - The matrix is technically complete, but it reads like a grid dump.
  - Row labels, attribute values, and action row all share similar visual treatment.
- Expected:
  - Compare must privilege the 3 to 5 decision rows that actually determine selection.
- Operator impact:
  - More effort than necessary to compare two options.
- Recommendation:
  - Promote top differentiators visually.
  - Compress secondary rows under progressive disclosure.

#### P2-10 Active quote review still feels too technical for a commercial review surface

- Surface: `quote review`
- Evidence: [quote-review.png](./assets/uxui-visual-audit-2026-03-10/quote-review.png)
- Observed:
  - The quote page still exposes a lot of operator-system framing before feeling like a polished quote review.
  - Coverage, package, categories, pricing, more options, compare, and requote all compete inside one long continuous stack.
- Expected:
  - The commercial review page should prioritize summary, selected package, price, caveats, and next step.
- Operator impact:
  - The screen feels operationally correct but visually unresolved.
- Recommendation:
  - Rebuild the quote page around primary commercial blocks first, then layer operator controls beneath or behind drawers.

#### P2-11 Export review leaks technical metadata and raw enum values

- Surface: `export review`
- Evidence: [export-happy-path.png](./assets/uxui-visual-audit-2026-03-10/export-happy-path.png)
- Observed:
  - `Snapshot summary` shows raw values such as `exported`, `abierta`, `best_match`.
  - `Storage path` is visible in the main operator-facing review.
- Expected:
  - Export review should focus on artifact readiness, share confidence, and download action.
- Operator impact:
  - Makes the export surface feel like an admin/debug page.
- Recommendation:
  - Remove storage path from the main export review.
  - Normalize raw enum output into product language.

#### P2-12 Dark theme uses a strong banded background that strains dense workbench reading

- Surfaces: `conversation`, `quote`
- Evidence: [conversation-dark-tablet.png](./assets/uxui-visual-audit-2026-03-10/conversation-dark-tablet.png), [export-blocked-error.png](./assets/uxui-visual-audit-2026-03-10/export-blocked-error.png)
- Observed:
  - The dark gradient is visually dramatic and creates repeated bright-dark banding behind already dense content.
  - Secondary text and meta elements become harder to read at speed.
- Expected:
  - Dark mode should preserve density and reduce strain, not add atmosphere at the cost of legibility.
- Operator impact:
  - Lower scan comfort during long sessions.
- Recommendation:
  - Flatten the dark background and increase contrast discipline for secondary copy.

#### P2-13 Versions page has the right model but still asks the operator to parse too much text

- Surface: `versions`
- Evidence: [versions.png](./assets/uxui-visual-audit-2026-03-10/versions.png)
- Observed:
  - Timeline cards are readable, but the detail pane remains text-heavy and partly English.
  - The diff explanation is useful but not visually compressed enough.
- Expected:
  - The operator should see what changed in one glance: added, replaced, removed, status change.
- Operator impact:
  - Slower diff comprehension than necessary.
- Recommendation:
  - Convert diffs into a more explicit visual change list with stronger category chips and clearer visual grouping.

### P3 Findings

#### P3-14 Monospace usage is overextended and competes with actual content hierarchy

- Surfaces: almost all
- Evidence: [workspace-empty.png](./assets/uxui-visual-audit-2026-03-10/workspace-empty.png), [quote-review.png](./assets/uxui-visual-audit-2026-03-10/quote-review.png)
- Observed:
  - Eyebrows, pills, runtime badges, and meta labels all lean heavily on monospace, making many secondary elements feel equally important.
- Recommendation:
  - Reserve monospace for actual system metadata, not most section labels.

#### P3-15 Case sheet internal notes panel is visually correct in concept but still competes with the case sheet block

- Surface: `case sheet`
- Evidence: [case-sheet.png](./assets/uxui-visual-audit-2026-03-10/case-sheet.png)
- Observed:
  - The internal note panel occupies a large clean pane while the actual case facts are more fragmented.
- Recommendation:
  - Keep the note panel internal-only, but reduce its visual weight or move it below the case summary on medium layouts.

## Surface Direction Requests For UX/UI

### Shell and hierarchy

- Merge the workbench header and summary banner into one primary top module.
- Move runtime badges out of the main product header.
- Reduce duplicate empty-state copy between sidebar and main pane.

### Conversation model

- Make one block the source of current status and next action.
- Cap the number of visible state cards by urgency.
- Keep transcript subordinate to continuity by default.

### Quote and export

- Rebuild quote review as a commercial page first and operator control page second.
- Remove raw system metadata from the export review.
- Humanize blocked action states with product wording and corrective next steps.

### Compare and versions

- Shorten compare to the highest-value rows first.
- Convert version diff into visual deltas instead of prose-heavy lists.

### Responsive and theme

- Define a mobile shell on purpose. Do not rely on stacked desktop cards.
- Reduce the dark theme background intensity and strengthen text contrast.

## Copy and Microcopy Corrections Requested

- Lock one language for all operator surfaces.
- Remove raw enum output from operator views.
- Replace technical phrasing like `Transient visible failure`.
- Review CTA set for consistency:
  - one verb system for open/view/review/select/export/reactivate/archive
- Remove repeated summaries when they do not add new information.

## Product Decisions Needed Before Next UI Iteration

- Primary language of the operator product
- Whether runtime environment indicators stay visible in operator mode
- Whether mobile is a supported working surface or a read-only companion surface
- Whether export review is an operator admin screen or a polished pre-share screen
- Whether compare is a core first-class surface or a secondary decision tool

## Closure

This audit is complete against the reviewed scenarios and evidence set captured on 2026-03-10.

The repo now contains:

- a stable evidence folder under `docs/assets/uxui-visual-audit-2026-03-10/`
- this findings report
- a separate manual checklist for UX/UI execution

The next step should be a UX/UI correction pass driven by the `P1` items before any cosmetic tuning.
