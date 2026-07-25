---
name: project-e09-student-absences-pattern
description: US-E09.6 Student Absences UC pattern — 2-state one-way domain distinct from approval workflow, dual-empty-state-by-role, orthogonal-badge assertion, immutable-natural-key-not-rendered-as-input AC
metadata:
  type: project
---

US-E09.6 (student-absences, epic E09) modeled 8 UCs for a `RECORDED` →
`FLAGGED_UNEXCUSED` one-way 2-state domain — explicitly NOT the shared
DRAFT/SUBMITTED/APPROVED/REJECTED approval workflow used by sibling
US-E09.5 (staff-discipline). Reusable shapes for future "simple one-way flag"
features in this repo:

- **Dual empty-state-by-role AC**: same empty copy text but teacher variant
  gets a CTA ("Ghi nhận nghỉ học"), principal/read-only variant gets static
  copy + NO CTA — write both as separate, explicitly-contrasted AC (not one
  AC with a role branch buried in prose).
- **Immutable-natural-key-not-input assertion**: when a PATCH endpoint takes
  identity fields only via path/query (never body), the edit-form AC must
  assert those fields render as **static text, not even a disabled input**
  — "fails if rendered as an editable control, even a disabled one" is the
  right phrasing to prevent a lazy disabled-input implementation from
  passing review.
- **Orthogonal-badge assertion (FR-007 shape)**: when two boolean-ish signals
  exist on one entity (here: `excused` bool + `state===FLAGGED_UNEXCUSED`),
  write an explicit AC enumerating ALL combinations (true+flagged,
  false+unflagged, false+flagged, true+flagged) to prove the two are never
  conflated into one pill — a single "renders correctly" AC is insufficient.
- **Genuine-absence negative AC (FR-006/FR-013 shape)**: "no unflag ever" is
  modeled as its own AC applying across BOTH roles and ALL states, phrased
  as "a genuine absence of a feature, not a permission-hidden one" — reused
  from the E17/E19 empty-state negative-assertion pattern family.
- Reused directly from [E20 admin-parent-links pattern] (see
  `docs/stories/epics/E20-parent-student-links/US-E20.1.../use-cases.md`
  UC-006): the two-halves server-side-re-check-independent-of-client-gate
  security UC shape (role re-check + resource-ownership re-check as two
  lettered sub-scenarios in one UC, each with its own explicit
  "must be testable by directly invoking the repository/use-case with a
  forged role/id" AC) — applied here at *normal* lane rigor (not high-risk),
  proving the pattern generalizes across lanes, not just high-risk stories.
- Design-spec had no distinct mobile breakpoint layout (unlike E20.1's
  card-list mandate) — when a responsive UC finds nothing beyond standard
  padding/reflow in `design-spec.jsonc`, write that explicitly ("this story
  has no card-list breakpoint requirement, unlike X") rather than inventing
  a breakpoint variant that isn't in the spec.
