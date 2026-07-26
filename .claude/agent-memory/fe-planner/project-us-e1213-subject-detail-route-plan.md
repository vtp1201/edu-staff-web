---
name: project-us-e1213-subject-detail-route-plan
description: US-E12.13 Subject Detail deep-link route plan — hook/component split for shared Sheet+page body, Archive stays page-only, inline not-found (no redirect)
metadata:
  type: project
---

Plan written into `docs/stories/epics/E12-admin-core/US-E12.13-subject-detail-route/story.md`
(`## Implementation Plan`), 2026-07-26.

Key decisions worth remembering for similar "Sheet → also needs a full page" work:

- **Split extraction into a state hook (`useSubjectDetailForm`) + a presentational
  fields component (`SubjectDetailFields`)**, not a single monolithic shared component.
  Why: Sheet footer chrome (SheetFooter, inline) and full-page footer chrome (sticky
  bottom save bar per design ref) differ visually — forcing one wrapper component would
  either fork the footer anyway or contort one consumer's layout. Splitting state from
  presentation lets each consumer keep its own footer while sharing 100% of field/
  validation/save logic. Apply this split whenever two consumers need the same *logic*
  but different *chrome*.

- **Archive ownership**: when a Sheet-vs-page pair diverges on which actions are exposed
  (Sheet never had Archive; only the table row did), do NOT silently add the missing
  action into the shared extracted body "for free" — check the AC and existing tests
  first. Regressing a currently-passing Sheet test suite by adding new behavior nobody
  asked for is worse than an asymmetric component API. Extract the *reusable dialog
  pattern* (AlertDialog + blocked-tooltip) once it has 2 real consumers, but gate which
  screens actually render it via props/composition, not by forcing feature parity.

- **Not-found pattern choice**: this repo has two competing patterns —
  `teacher/question-bank/[id]/edit/page.tsx` redirects to the list with `?notice=`;
  the design reference for Subject Detail (`design_src/edu/subject-detail.jsx`) renders
  an inline "not found" message with no redirect. When AC explicitly says "the route
  shows a not-found state" (not "redirects"), follow the design reference's inline
  pattern, not the nearest existing `[id]` route precedent — read the design_src file's
  actual not-found branch before assuming the codebase's existing convention applies.

- Flagged (not registered) a token-drift risk: Sheet's locked-field styling uses
  `bg-edu-info/15` (blue) but `design_src/edu/subject-detail.jsx` mockup uses
  `T.warning`/`warningLight` (amber) for the same "locked" semantic — pre-existing
  drift from US-E12.3, recommended NOT to reconcile inside this story (scope creep +
  regression risk to the "Sheet unchanged" AC).
