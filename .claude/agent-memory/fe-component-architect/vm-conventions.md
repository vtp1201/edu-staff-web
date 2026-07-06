---
name: vm-conventions
description: ViewModel interface conventions for i-vm.ts files — label injection, RSC-to-client boundary, error key pattern
metadata:
  type: project
---

## ViewModel conventions established across this codebase

**File naming:** `<component>.i-vm.ts` co-located with the presentation component.

**Error key pattern:** All screen VMs carry `errorKey: SomeFailure["type"] | null`.
`null` = success. The RSC maps domain failure → stable union type string key; the
presentation component translates via `t(errorKey)`. Never pass raw error messages
from server to client.

**isLoading pattern:** `isLoading: boolean` on screen VMs is a safety valve. The
primary loading state is the Suspense boundary fallback (skeleton component). RSC
pre-computes `isLoading: false` for the success path; `true` only when streaming.

**Route paths pre-computed:** RSC pre-computes app-relative route strings (e.g.
`studentsPath: "/teacher/classes/{id}/students"`) and puts them in the VM. The
presentational layer never does string concatenation for routes.

**Label injection pattern:** Pure presentational leaf components (ClassCard,
TeacherRosterTable, GenderBadge after promotion) do NOT call `useTranslations`.
The parent screen component calls `useTranslations` and injects all strings via
a `labels` prop object. This keeps leaves i18n-agnostic and unit-testable without
i18n context.

**initials field:** When a VM row has a name used in an Avatar, include a pre-computed
`initials: string` field in the VM (last-word initial, uppercased). RSC computes it;
the client component does not parse strings.

**`totalClasses: number | null`:** Dashboard VM extended with null-able counts uses
`null` to mean "unavailable" (same pattern as `totalStudents`). Render "—" em dash
when null.

**`SealActionResult<T>` / `ActionResult<T>` naming:** screens define their own
local `{ok:true,data:T}|{ok:false,errorKey:Failure["type"]}` result type in the
`.i-vm.ts` (e.g. `GradeApprovalScreenVM`'s `ActionResult`, `AcademicRecordSealScreenVM`'s
`SealActionResult`) rather than sharing one global generic — keeps each feature's
error-key union local and avoids an artificial cross-feature dependency.

**Multi-tab screen VMs:** when a screen has tabs with materially different data/
actions (US-E14.6 seal/unseal), nest a per-tab VM (`SealTabVM`, `UnsealTabVM`) inside
the top-level screen VM rather than flattening every field — keeps the container's
VM-building code and each tab's presentational component focused.

**Before finalizing an i-vm.ts, gap-check the planner's draft repo/Actions
interface against every UI affordance the mockup shows a picker/list for**
(e.g. US-E14.6's class picker and sealed-student picker had no backing query in
the Phase 3 draft — found by tracing "where does this dropdown's data come from"
for every `<select>`/combobox in the `design_src/edu/*.jsx` mockup). Add the
missing query action explicitly and call it out as a fix vs the draft, don't
silently patch over it.

**Split a single "confirm dialog" into two when the underlying actions have
different semantics** (blocking error vs warn-and-proceed) — US-E14.6's
same-admin error (AC-8, dead-end) vs self-approve fallback (ADR 0037, proceeds
with a warning) are different enough to need separate components + separate
Storybook stories, even though the planner's draft bundled them into one
`unseal-confirm-dialog.tsx`.
