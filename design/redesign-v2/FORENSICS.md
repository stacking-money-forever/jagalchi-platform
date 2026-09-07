# Jagalchi UX redesign forensics

## Scope

- redesign depth: information architecture, layout, and visual tone
- product logic: strict preservation
- information architecture: low preservation
- components: low preservation
- visual language: medium preservation
- product-screen mutation: denied until a redesign preset is approved

## Symptoms

- The myroadmap page combines populated Project Runs and an empty legacy Roadmap grid,
  so users see contradictory ownership and empty states.
- Project detail loses the common shell and exposes raw IDs, enums, operations,
  projection versions, and provenance before a user can identify the next task.
- Map, Linear, Focus, and Proof are peer destinations rather than one coherent
  project journey.
- Primary actions are state management commands, not the user's next meaningful
  action.
- Create exposes the internal workflow sequence instead of the user decisions.
- Proof mixes project evidence, publication management, and account-wide profile
  editing.
- Dark mode uses near-black layers that read as an operator console rather than
  a comfortable workspace.

## Root causes

- Structural: competing product models, unclear IA, no stable home/detail/re-entry
  hierarchy, and technical vocabulary at the default reading layer.
- Component anatomy: generic cards and equally weighted controls instead of a
  current-task focal point and progressive disclosure.
- Tone: high-contrast black surfaces, dense diagnostic text, and status controls
  set the emotional world to "admin console."

## Not root causes

- A missing accent color, a new icon pack, glass effects, decorative motion, or
  simply renaming the existing tabs.

## User constraints

- The product must be user-friendly: plain language, a visible next action,
  understandable recovery, and no exposed implementation detail by default.
- The roadmap must use React Flow as a meaningful project journey, not a
  decorative graph or raw server-projection dump.
- Dark mode must remain dark but use brighter layered charcoal surfaces,
  comfortable contrast, and semantic status colors rather than pure black.
- Existing product logic, safety checks, API contracts, and source ownership
  remain intact.
