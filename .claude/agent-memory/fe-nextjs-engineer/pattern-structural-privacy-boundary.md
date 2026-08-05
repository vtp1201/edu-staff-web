---
name: pattern-structural-privacy-boundary
description: "E18.44: role-stripped BE fields modelled as a SEPARATE staff cell type (not optional fields on the shared one) + @ts-expect-error compile-time proof; capability-as-presence VM prop + requireRole in the action; new canonical shared reason-dialog; disabled-button click breaks a Storybook play"
metadata:
  type: project
---

BE fields that are STRIPPED for some roles must be a **separate type**, not
optional fields on the type both paths share.

**Why:** US-E18.44's `rejectionReason/rejectedBy/rejectedAt` are staff-only
(stripped on student/parent reads). `GradeCell` was shared by the teacher-entry
path (`GradeSheet`) and the multi-role read path (`GradeBook` →
`getMyGrades`/`getChildGrades`). Adding `rejection?` to `GradeCell` would have
made the student/parent surface able to *reference* the field — a leak one
careless render away. Splitting (`StaffGradeCell extends GradeCell` used only on
the entry path) makes the leak a **compile error**.

**How to apply:**
- Two mappers, each with a "do not merge these" comment: narrow
  `mapGradeCell` (read path — silently drops the fields even if the wire leaks
  them) and `mapStaffGradeCell` (conditional spread, absent ≠ empty string).
- Prove it BOTH ways: `@ts-expect-error` on `readCell.rejection` and
  `GradeBookRow.scores.x.rejection` (a future widening makes the directive
  unused → `tsc --noEmit` fails = the guard is self-enforcing), plus a runtime
  `Object.keys` / `JSON.stringify(...).not.toContain(...)` strip test.
- Group multi-field wire payloads into ONE optional object
  (`rejection?: {reason, rejectedBy?, rejectedAt?}`) when they arrive as one
  cycle — a single presence check can't be got partially wrong.
- Widen the STAFF write returns too (`saveScore`/`submitScore` →
  `StaffGradeCell`): BE doesn't clear the payload on resubmit, and a
  `GradeCell`-typed return makes the field invisible-but-present.

**RBAC on a new mutation (2 gates + BE's 403):**
1. Capability-as-presence in the VM (`rejectEntryAction?` absent for a teacher →
   no control and no dialog in the DOM at all, not a disabled one) — the
   established idiom here (`GradeBookScreenVM.lockTermAction`).
2. `requireRole([...])` INSIDE the Server Action before any DI/HTTP call — a
   Server Action is a public endpoint; the absent VM prop is UI only.
   BE `ADMIN`+`MANAGER` both collapse to appRole `principal`
   (`ROLE_ENUM_TO_APP`); `admin` covers platform-admin + mock mode
   (`decodeRoleClaim` returns "admin" for any token when `USE_MOCK`).

**Canonical shared reason-dialog:** `components/shared/reason-confirm-dialog/`
(caller owns all copy via props + a pure `validate-reason.ts` for node-env
tests). FOUR pre-existing forks still exist (discipline `reject-leave-dialog`,
grades `revision-request-dialog`, `staff-discipline/sd-reject-panel`,
`staff-leave` request card) — migrating them is a separate story
(cross-feature story blast radius), but do NOT add a 5th fork.

**Storybook gotcha:** `userEvent.click()` on a **disabled** button throws
("element has `pointer-events: none`") and fails the play — assert
`toBeDisabled()` (+ a keyboard press) instead of clicking to prove
"can't submit".

Related: [[pattern-role-discriminated-vm]], [[pattern-two-gaps-one-forcemock]]
(US-184 retired only ONE of the batch approval factory's force-mock reasons —
ask #18's missing `batchId` source + tenant-wide rollup still stand).
