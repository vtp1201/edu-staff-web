---
name: us-e24.20-qa-patterns
description: US-E24.20 (leave fan-out, principal read-only gate, form consolidation) — strong baseline with one real gap; open-dialog stories often stop short of a completed submit
metadata:
  type: project
---

QA gate on US-E24.20 (backlog #5/#8/#12: leave-request fan-out, principal
read-only gate, form consolidation). Both gates (tech-lead APPROVED after 1 fix
round, a11y PASS) were accurate — 7th consecutive session with an exceptionally
strong self-reported baseline, but still one genuine coverage gap.

**What was fully proven (no gap):**
- #5 fan-out: `teacher/discipline/page.test.ts` + `principal/discipline/page.test.ts`
  both prove the exact things a reviewer could rubber-stamp without proving —
  MULTI-class fan-out (2+ classes, not just one), `Promise.allSettled`
  per-class degrade (one rejected class ≠ blank tab), use-case built ONCE and
  reused, zero-homeroom → empty with no refused call, className passthrough
  stamped per row. `discipline.mock.repository.test.ts` (separate file from
  the main `discipline.repository.test.ts` — grep by filename first, don't
  assume one file holds all repo tests) proves the disjoint mock-id-space fix
  with BOTH caller shapes (`cls-…`/`c-…`) plus a "neither space matches" empty
  case.
- #8 principal gate: `LeaveTab_Principal_NoDecisionButtons` asserts BOTH
  approve and reject buttons absent (`toHaveLength(0)`) while the pending
  status text still renders (read-only, not hidden row); `LeaveTab_WithPending`
  (teacher) + `LeaveTab_Reject` prove zero regression to the functional
  approve/reject/reason-dialog flow.
- #12 dialog consolidation: `PastStartDateBlocksSubmit` +
  `ParentDisciplineScreen_LeaveForm_NoPastDate_NoType` both prove the guard the
  RIGHT way per [[us-e24.20-gotcha]] below — TYPE a past date, fill reason
  first, assert `toBeDisabled()` (never just `toHaveAttribute("min", …)`, which
  is decorative on a plain-button submit outside a `<form>`). `WithoutAttachments`
  proves the file input is fully absent AND `onSubmit` still receives
  `files: []`. `parent-attendance-screen.tsx`'s own dialog call passes no
  `showAttachments` prop at all → default `true` → unaffected, confirmed by
  reading the call site (its stories still upload real files).

**The one gap found and closed:** `student-conduct-screen.stories.tsx`'s
`LeaveRequestForm` story only proved the dialog OPENS with the right shape
(no type select, no attachment picker) — it typed a reason and asserted submit
becomes enabled, then STOPPED. No story anywhere completed the submit and
checked the `t("success")` toast the AC explicitly names. This is the same
"open ≠ complete" class of gap as [[us-e10.3-qa-patterns]] (12 gap stories
there). Root cause here was narrower: the file's `Toaster` was never mounted
in the decorators (same gotcha as [[us-e19.1-qa-patterns]]), so even a
completed submit would never have shown a visible toast to assert against.
Fix: add `<Toaster />` next to `<Story />` in the decorator, add a new
`LeaveRequestForm_SubmitSuccess` story that clicks through to a real submit and
asserts the exact success-toast text (read straight out of
`messages/vi.json` — `discipline.studentConduct.leaveRequest.success`) plus the
optimistic pending entry text. The parent-side twin
(`ParentDisciplineScreen_LeaveForm_Valid`) already did this correctly — asymmetric
coverage between two nearly-identical consolidated forms is worth checking for
explicitly when one screen's story predates the other's.

**Process note:** always grep the mock-repository test file by its OWN path
(`infrastructure/repositories/mocks/discipline.mock.repository.test.ts`)
separately from the main repository test file — a `find -iname` for the
component under review can miss it if the filename doesn't contain the term
you searched for.
