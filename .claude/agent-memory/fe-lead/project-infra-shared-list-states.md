---
name: project-infra-shared-list-states
description: INFRA-shared-list-states consolidation story — shared ListSkeleton/ListError extraction, 5th-instance survey gap, shape-preset dedup pattern
metadata:
  type: project
---

INFRA-shared-list-states (merged `23a0604`) extracted `components/shared/list-skeleton/` +
`components/shared/list-error/` from 5 near-duplicate feature-local list-state components
(staff-discipline, student-absences, admin/parent-links, admin/invitations, user profile
parent-consent-section), closing a promotion flag `fe-component-architect` raised twice
(US-E09.5, US-E09.6 §0) per decision 0026.

**Why:** the pattern had 2 real structural sub-families (not 1) — "inline card" (outer itself
`role=status aria-busy`/`role=alert`, `message`+`onRetry`) and "bordered card" (separate sr-only
status span + `aria-hidden` rows, `title`/`description`+`onRetry`, boxed-or-plain icon). A single
component design that owns ONLY the wrapper + a11y wiring + row loop, with 100% caller-owned
`renderRow`, correctly covered both without forking — the row shape (avatar or not, badge count)
was the real per-screen variance, not the container.

**How to apply next time a consolidation story is briefed:**
- **The ground-truth grep for "N near-duplicate copies" will usually miss 1.** Two review rounds
  in this repo now (`INFRA-shared-list-states`) found an extra instance the lead's own initial
  grep missed (`consent-error.tsx`, an exact match for the "bordered card" family) — caught by
  `fe-tech-lead-reviewer`, not the original survey. Brief the reviewer explicitly to re-grep the
  pattern (`role="alert"` + `AlertTriangle`, `role="status"` + `Skeleton`) rather than only
  reviewing the diff, and to grep deleted-component names still cited in surviving files' doc
  comments (those are almost-always the missed instances self-documenting their own gap).
- **A shared component born from parameterizing extraction round 1 will still leave a residual
  duplicated class literal at 2+ call sites** — round 1 gave each call site a `className` escape
  hatch for the outer card, but 2 sibling call sites in the SAME family (SD/SA) then had to pass
  the IDENTICAL literal string. Fix in round 2: a required `shape` preset prop
  (`"inline-card" | "bordered-card"`) supplying the outer-card + retry-spacing default, with
  `className` staying only for genuine per-screen deltas (`py-10`/`py-12`/`py-13`). Brief this
  proactively in round 1 next time, not as a round-2 finding.
- **`titleClassName`/`descriptionClassName` should REPLACE, not merge (via `cn()`), the default
  typography** when a variant like Invitations needs a different color/spacing entirely — merging
  makes the "parity" proof depend on tailwind-merge's conflict-resolution behavior instead of
  being an explicit, test-asserted override.
- A discriminated union (`{ message: string } | { title: string; description?: string }` with
  `?: never` on the other branch) is the right shape for "mutually exclusive content props" —
  makes the wrong combination a compile error instead of an all-optional hole.
- One deliberate, disclosed a11y-driven visual delta is fine mid-refactor (here: unconditional
  `min-h-11` retry button, 44px touch target) — but the story packet's AC/Design Notes must say so
  explicitly ("X screens now render N px taller"), not claim "pixel output unchanged". A reviewer
  will catch the discrepancy between the packet's own claim and the actual diff.
- See [[feedback-agent-relay-resilience]] — this story also hit a background-agent relay gap: a
  resumed `fe-nextjs-engineer` kept editing files (fixed its own tests to match its new API) after
  its "no live children" notification fired, so re-reading the actual working tree before
  re-applying findings avoided a duplicate/conflicting edit.
