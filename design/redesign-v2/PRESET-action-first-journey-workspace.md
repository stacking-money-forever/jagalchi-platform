# Preset: Action-first Journey Workspace

## Status

- state: ROLLOUT_ALLOWED
- screen mutation: allowed for user-approved Home, Create, navigation, and owner
  Proof readability scope; public resource mapping remains blocked
- redesign depth: information architecture, layout, visual tone
- source of synthesis: FORENSICS, PRESERVE-KILL-QUESTION, Gemini directions,
  Kimi senior review, and Astra adjudication

## Thesis

One project detail answers two questions in this order:

1. What should I do now?
2. Where is that work in the project journey?

The task body is the reading and action anchor. React Flow is a synchronized
relationship view with real explanatory value, not a fixed-size dashboard
surface or a control the user must operate to finish work.

## Preserve

- Project/task/proof DTOs, server state/version/idempotency guards, fixture
  honesty, read-only plan semantics, and existing direct task URLs
- React Flow engine, but not incorrect adapter/layout presentation behavior
- Wanted Sans, existing primitives, semantic tokens, light/dark support
- explicit user review, non-goals, real GitHub/PR labels, and actionable error
  recovery

## Remove

- map/linear/focus/proof peer tabs
- default raw IDs, enum labels, operation IDs, projection versions, and
  provenance
- Home's competing legacy Roadmap empty/grid presentation
- pure-black application surfaces, component-local hex, glass, neon,
  confetti, generic metrics, and decorative motion
- any promise of repository creation, task-level independent PR binding,
  automatic public link, or verified GitHub proof for fixture data

## Layout contract

### Desktop detail

- AppShell and one owner-detail route remain visible.
- Header: honest project identity, target context, current run state, and a
  back link to My Projects.
- Main reading column: current task title, purpose, outcome, completion
  criteria, evidence needed, then one state-valid primary action.
- Journey column: React Flow stage cards showing current, selected, ready,
  locked, optional, completed, and blocked tasks with actual prerequisite
  relationships.
- There is no immutable 60:40 split. The reading column keeps a usable minimum
  width; when it cannot, the journey moves below it or collapses to the
  accessible list.
- Node selection changes only the viewed task. It never starts, resumes,
  verifies, publishes, or changes server current state.

### Mobile detail

- Default: current task body followed by semantic linear stage list.
- React Flow is an explicit map expansion of the same selection state.
- All core actions remain possible from the task body/list without pan, zoom,
  drag, or canvas keyboard navigation.
- Selected task details remain inline or in one non-overlapping sheet; no
  second fixed action bar competes with global navigation.

### Journey semantics

- React Flow nodes use human task titles and textual status, never raw IDs.
- The journey explains real prerequisite/current/ready/blocked relationships.
- Empty milestones, ungrouped valid tasks, and proof readiness use corrected
  presentation logic; no empty task set can look ready to publish.
- Map DOM identities differ from task-body hash/link targets to avoid duplicate
  IDs when both are mounted.
- A list and canvas share selection; explicit task URL intent wins over stored
  view preference.

## State and action contract

Action resolution order:

1. session, entitlement, run archival, fresh version, and conflicting pending
   operation
2. actual current versus merely selected task
3. task state and known repository/PR binding scope
4. exactly one primary action, or a status/clear recovery path

Examples:

- READY: start task
- IN_PROGRESS with known run-level PR: request verification
- IN_PROGRESS with no known PR: explain that project-level binding is needed;
  show its actual supported route only
- VERIFYING or conflicting pending: status only; preserve reading/navigation
- DONE: next valid task or task-proof summary; never auto-publish
- LOCKED/BLOCKED: prerequisite or known reason, then a valid recovery path

Drafts, async responses, errors, and focus are task-scoped. Selecting another
task cannot submit a prior task's note/question or display its response as
belonging to the new selection.

## Proof honesty

- Owner detail may show existing run verification/publication/facts with a
  fixture limitation.
- Project description does not write the account-wide Proof Profile summary.
- Run publication, profile activation, mission/public proof, lease validity,
  and canonical public URL remain separate until their mapping is proven.
- No share/copy CTA appears from an inferred or unrelated public ID.

## Visual contract

- Dark mode is layered charcoal through existing semantic token roles only.
  The global dark values for background, surface, surface-raised, foreground,
  muted-foreground, border, input, ring, and state tokens replace the pure-black
  theme; a second token system is not created.
- Color roles are measured after alpha composition. Ordinary text meets 4.5:1;
  meaningful controls, boundaries, node states, and focus indicators meet
  3:1; low-emphasis dividers are not interaction indicators.
- Dark is readable and calm, not pure black. Locked task titles and
  prerequisites stay readable; opacity never hides required context.
- Motion is N/A except existing functional press/focus and explicitly requested
  fit/current-task movement. Reduced motion uses immediate placement and text
  feedback.

## Components

- JourneyWorkspace: route shell and responsive reading/journey arrangement
- CurrentTaskDocument: action-first task body, state feedback, task-scoped draft
  ownership
- JourneyMapCanvas: React Flow stage cards and real relationship view
- JourneyList: equal semantic task selection and keyboard/mobile fallback
- JourneySelectionController: shared selection, URL intent, stored view
  preference, and focus return
- OwnerProofSummary: existing facts and honest limits only

Existing Button, Badge, Input, Textarea, lucide, and token primitives are
reused. No parallel component library is introduced.

## Exemplar boundary

Allowed now:

- one owner route: projects/[runId]
- AppShell detail integration, current-task document, journey canvas/list,
  selection/action safety, global semantic charcoal token values
- corrected journey presentation for nullable milestones, ungrouped tasks, and
  false proof readiness
- minimal owner proof summary without editing account profile or inventing
  public linkage

Deferred:

- Home My Projects IA, Create rewrite, global navigation redesign, legacy
  roadmap relocation, account Proof Profile/lease UI, public proof page,
  API additions, provider changes, and persistent pre-creation drafts

## Acceptance criteria

Structural:

- one route has no peer technical tabs, duplicate main/rail, duplicate task DOM
  identity, raw default diagnostics, or map-only core path
- current task document precedes journey controls in reading order
- canvas/list/detail selection are synchronized without mutation

Accessibility:

- keyboard and mobile users complete normal task work without canvas interaction
- all task states are text plus semantic status, focus targets are visible, and
  project controls are at least 44px
- 320px and 200% text reflow preserve a usable task action path

Visual:

- 390px and 1440px light/dark captures show hierarchy, readable locked states,
  no overflow, and charcoal surfaces instead of pure-black console tone
- no direct component hex, glass, neon, confetti, or decorative motion

Design intent:

- a cold user can identify current task, its completion condition, and the
  state-valid next action without a tour
- the journey adds prerequisite/current/ready/blocked context rather than
  reproducing a raw graph
- fixture/proof/public limitations are explicit and not framed as user failure

## Approval defaults

- D1: approve this one-route action-first Journey Workspace exemplar
- D2: defer Home/legacy relocation; later preserve legacy data and direct URLs
  under a Library context rather than deleting it
- D3: defer global mobile navigation changes; no second fixed action bar in the
  exemplar
- D4: defer public-proof integration until run-to-public resource mapping is
  proven
- D5: defer API project title and task time/difficulty additions; use only
  truthful current DTO fields
