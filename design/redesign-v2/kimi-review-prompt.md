FROM CODEX

You are the senior design reviewer for Jagalchi's destructive UX redesign.
Read these exact artifacts in full:

- design/redesign-v2/FORENSICS.md
- design/redesign-v2/PRESERVE-KILL-QUESTION.md
- design/redesign-v2/GEMINI-DIRECTIONS.md

Do not edit product source, commit, push, deploy, or create product screens.
Gemini's document is a junior handoff, not a fact source. Verify its claims
against the current repository when needed.

Return a senior verdict that:

1. evaluates each of the three structural directions against the user constraints;
2. selects, rejects, or tightens a direction with direct reasons;
3. calls out any unsupported API/public-proof/create-flow claim, false
accessibility promise, hardcoded-token violation, generic-template risk, or
mobile interaction risk;
4. produces 2-3 final RedesignPreset candidates with the fixed schema:
   name, thesis, preserve, remove, layout(shell/home/detail/navigation/density),
   visual(palette/typography/radius/imagery/iconography), components,
   interaction(filtering/primaryAction/feedback), risks;
5. recommends exactly one preset for the user approval gate;
6. gives an exemplar-first implementation boundary and structural,
accessibility, visual, and design-intent acceptance criteria;
7. lists the decisions still exclusively owned by the user.

Important constraints:

- React Flow must be meaningful and central enough to show a project journey,
  but no canvas operation may be required for core mobile or keyboard work.
- Dark mode must be brighter layered charcoal using semantic tokens, not pure
  black, direct hex styling, glass, neon, confetti, or decorative motion.
- Product logic and contracts are preserved. Do not invent new repository
  creation, public-link, or provider capabilities.
- State-specific actions must remain server-authoritative and honest.

Write the complete review to:
/Users/justn/.herdr/worktrees/jagalchi-platform/ux-redesign/design/redesign-v2/KIMI-SENIOR-REVIEW.md
