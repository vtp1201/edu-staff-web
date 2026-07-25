# 0062 Staff Discipline & Student Absences — route correction (principal, not admin, is the BGH-tier actor)

Date: 2026-07-25

## Status

Accepted

## Context

DR-022 delivered `design_src/edu/staff-discipline.jsx` and
`design_src/edu/student-absences.jsx`, with `docs/product/screens.md` +
`docs/product/design-spec.jsonc` (`screens.staffDiscipline`,
`screens.studentAbsences`) placing the BGH/admin-tier actor's routes under
`(app)/admin/staff-discipline` and (as an alias) `(app)/admin/absences`.

Ground-truthing during `/ba` intake (US-E09.5/US-E09.6) found both mockups'
own role checks contradict that placement:

- `staff-discipline.jsx:280` — `const isApprover = role === 'principal'`
  (full author + submit + approve/reject capacity). `role === 'teacher'`
  renders the staff member's own read-only self-view. Neither check ever
  reads `role === 'admin'`.
- `student-absences.jsx:147-148` — `isTeacher = role === 'teacher'`,
  `isAdminTier = role === 'principal'`. Same pattern — the flag-only
  admin-tier actor is `'principal'`, not `'admin'`.

This app's 5-role model (decision `0022`) has a *separate, narrower* `admin`
role for admin-core config screens (school-setup, calendar, subjects, roster,
parent-links, invitations). `(app)/admin/layout.tsx`'s `evaluateAdminAccess`
(US-E12.8) enforces `role === "admin"` **strictly** — it redirects
`role === "principal"` to `/principal` before any `/admin/**` page renders
(`role-guard.test.ts:20-24`). The DR's own role table conflated the BE conduct
domain's `ADMIN`/`MANAGER` actor names (BGH-capacity authorization roles
inside `edu-api`'s `conduct` sub-domain) with this app's distinct `admin`
route-guard role — an ambiguous-naming mistake, not an intentional placement.

Net effect if left uncorrected: a `principal` actor (the only role the
mockups actually grant author/approve/flag capacity to) would be redirected
away from `/admin/staff-discipline` and `/admin/absences` before ever
rendering the screen — the feature would be unreachable by its own intended
actor. An `admin`-role actor could reach the URL but would see neither the
approver UI (`isApprover`/`isAdminTier` false) nor the self-view (`teacher`
false) — an unhandled third state.

## Decision

Route both screens under the existing `(app)/principal/**` and
`(app)/teacher/**` groups, matching the mockups' actual role checks —
**no change to `(app)/admin/layout.tsx`'s strict guard** (decision `0022`/
`0024` stays as-is; this is not an admin-core screen):

- **Staff Discipline**: `(app)/principal/staff-discipline` (principal: author
  + submit + approve/reject + `selfApproved` fallback, full screen) and
  `(app)/teacher/staff-discipline` (teacher: read-only self-view). Drop the
  `(app)/admin/staff-discipline` route.
- **Student Absences**: `(app)/teacher/absences` (teacher/GVCN: record + edit,
  unchanged, already correct) and `(app)/principal/absences` (principal:
  schoolwide/class-filtered flag-only view, unchanged, already correct). Drop
  the `(app)/admin/absences` alias.

Both screens keep the DR's "one component, role-conditional" pattern — same
proven precedent as `discipline.jsx` already serving both `/teacher/discipline`
and `/principal/discipline` from one `DisciplineScreen`.

`docs/product/screens.md` and `docs/product/design-spec.jsonc`
(`screens.staffDiscipline.routes`, `screens.studentAbsences.routes`) are
corrected in the same edit as this decision — a factual route fix, not a
redesign; no visual/token change.

## Alternatives Considered

1. Broaden `(app)/admin/layout.tsx`'s guard to also allow `role === "principal"`
   — rejected: that guard is shared by every admin-core screen (school-setup,
   roster, parent-links, invitations, etc.); loosening it for two stories
   would silently grant principal access to unrelated admin-core config
   surfaces, a much larger authorization change outside this story's scope.
2. Keep the `/admin/*` routes and change the mockups'/features' actor check to
   `role === "admin"` — rejected: contradicts the DR's own stated actor model
   (BGH/principal is the school-administration persona in this app, per the
   existing `staff-leave.jsx`/`discipline.jsx` precedent) and would require
   redesign of the jsx reference mockups, out of `/ba`'s scope (design changes
   belong to `/uiux`).

## Consequences

Positive:

- Feature is actually reachable by the actor the design already implements
  for it, with zero change to the existing strict admin-core guard.
- Reuses the established one-component-multi-role-route pattern
  (`discipline.jsx`) instead of inventing a new routing shape.

Tradeoffs:

- `docs/product/screens.md` / `design-spec.jsonc` route rows written by
  DR-022 needed a same-day correction — a small documentation churn, not a
  functional regression (nothing had been implemented against the old routes
  yet; caught before `/fe` build).

## Follow-Up

- `/fe` implements at `(app)/principal/staff-discipline`,
  `(app)/teacher/staff-discipline`, `(app)/teacher/absences` (unchanged),
  `(app)/principal/absences` (unchanged).
- No change needed to `(app)/admin/layout.tsx`, `evaluateAdminAccess`, or any
  existing admin-core screen.
