# US-E24.20 Backlog batch 6 — leave-request fan-out fix, principal read-only gate, form consolidation (#5, #8, #12)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/discipline/` (repository interface +
  real repository + mapper + presentation `leave-tab.tsx` +
  `parent-discipline/components/` + `student-conduct-screen/components/`),
  `src/app/[locale]/t/[tenant]/(app)/teacher/discipline/`,
  `src/app/[locale]/t/[tenant]/(app)/principal/discipline/`,
  `src/components/shared/leave-request-dialog/` (canonical, extended not forked).
- Shared contract/file: `IDisciplineRepository.getLeaveRequests` signature
  (adds an optional `className` passthrough — additive, no existing caller
  breaks); `LeaveRequestDialog` props (adds optional `showAttachments` —
  additive, default preserves current behavior for its one existing consumer,
  `parent-attendance-screen.tsx`).

## Product Contract

Three FE-only harness backlog items (#5, #8, #12), batched because all three
touch the same leave-request surface (`features/discipline`, the leave-request
DI/use-case, and the leave form components) and would conflict if worked
independently — see EPIC-OVERVIEW / harness backlog for original filing.

### Premise verification (done before any code — see Evidence for ground-truth)

- **#5**: CONFIRMED as filed. `teacher/discipline/page.tsx` and
  `principal/discipline/page.tsx` both call
  `(await makeGetLeaveRequestsUseCase()).execute({})`. In real mode (`USE_MOCK
  = false`), `DisciplineRepository.getLeaveRequests` (`discipline.repository.ts:297-311`)
  refuses any call with no `classId` before HTTP, throwing `{type:"not-found"}`
  — the page's `try { … } catch { /* soft-fail to empty */ }` swallows it, so
  the "leave" tab silently renders empty (`EmptyState`) even when real leave
  requests exist for the caller's classes. Backlog #6 was already a confirmed
  duplicate. Ground-truthed against `edu-api`
  (`services/core/internal/conduct/core/application/usecase/list_student_leave_requests.go`
  `listByClass`): `classId` truly is mandatory on the wire — there is no
  "all classes" query — so the fix has to be a fan-out over a known class-id
  set, not a param the FE can invent.
- **#8**: CONFIRMED as filed, and ground-truthed one level deeper than the
  original filing. `LeaveTab` renders the approve/reject buttons for every
  `status === "pending"` row regardless of `vm.viewerRole`.
  `canDecideLeave()` (`leave-decision-auth-context.entity.ts`) already denies
  any `role !== "teacher"`, so a principal's click always resolves to
  `{errorKey:"forbidden"}` and a toast — the control is present but dead.
  Ground-truthed against `edu-api`
  (`services/core/internal/conduct/core/application/usecase/approve_student_leave_request.go`,
  `reject_student_leave_request.go`): the real endpoint has the IDENTICAL
  rule — "BGH has read-only oversight at MVP (no approval role, ADR 0073
  Follow-Up)" — this is not a client-side-only guess, the BE literally
  forbids BGH (ADMIN/MANAGER, principal's real-mode role) from approving or
  rejecting. So gating in the UI is not "hiding a feature that might work
  later", it matches a durable, documented BE rule.
- **#12**: CONFIRMED as filed. Three variants exist:
  `components/shared/leave-request-dialog/` (canonical, US-E24.6, matches
  core's real `CreateStudentLeaveRequestRequest` exactly — no `type` field,
  `minLength: 1` reason), `discipline/presentation/parent-discipline/components/LeaveRequestForm.tsx`
  (inline card, react-hook-form + zod, has a `type` Select, `min(10)` reason),
  `discipline/presentation/student-conduct-screen/components/leave-request-sheet.tsx`
  (Sheet, same `type`/`min(10)` shape). The canonical dialog's own doc comment
  already flags this consolidation as a "logged follow-up" — this item closes
  it.

### New ground-truth finding used to size the #5 fix (BGH read scope)

`list_student_leave_requests.go`'s `listByClass` branches on caller role: BGH
(ADMIN/MANAGER — principal in real mode) gets `ListByClass` (**every** state,
no homeroom check), a TEACHER gets `ListByClassAndState` (SUBMITTED only, and
ONLY if `IsHomeroomTeacher` — a 403 otherwise). Both branches still require a
concrete `classId` — there is no tenant-wide "all classes" query on the wire.
So:

- **Teacher fan-out set** = the caller's own **homeroom** class ids — the
  exact same read `makeLeaveDecisionAuthContext()` already performs
  (`makeListMyTeacherClassesUseCase()` filtered to `roles.includes("homeroom")`).
  Reusing it, not duplicating it.
- **Principal fan-out set** = every class in the tenant — the real,
  already-wired `makePrincipalClassesRepository().listClasses({academicYear,
  limit})` (`(app)/principal/classes`, US-E13.8/US-E18.30, `MANAGER`
  authorized server-side per that DI factory's own doc comment) — drained via
  its existing cursor pagination, same idiom `fetchAllPages` already uses
  inside the repository.

This is an **N+1 fan-out over a known class-id list**, not a new pattern —
matches this repo's established "no bulk endpoint on the wire → fan out over
the caller's own target list" idiom (E18-be-wiring epic, e.g. period-log
target-list fan-out). Accepted tradeoff, documented here rather than silently
shipped: for a school with many classes, `principal/discipline`'s initial
load now costs one HTTP round-trip per class (each already cursor-paginated
internally). No bulk `classId[]` endpoint exists to do better. If this proves
too slow in practice, that is a BE ask, not something the FE can solve
unilaterally — filed as a note in Harness Delta below, not implemented here.

### Fix — #5 (`teacher/discipline/page.tsx`, `principal/discipline/page.tsx`)

- `IDisciplineRepository.getLeaveRequests(params: {classId?: string; className?:
  string})` — new **optional** `className` passthrough (additive). The real
  repository already knows nothing about class display names (`toLeaveRequestEntity`
  defaults `className` to `""`); today that gap is invisible because the only
  real caller (`homeroom-vm.ts`) never renders `className` (it is already
  inside one class's tab). Fixing #5 makes `teacher/discipline` and
  `principal/discipline` render REAL rows for the first time in real mode, and
  those two screens DO render `req.className` per row (`leave-tab.tsx`) — so
  this fix must complete that passthrough, not ship a new blank-label defect
  in the same commit that makes the rows visible. `className`, when supplied,
  passes straight through to `toLeaveRequestEntity(dto, names, className)`.
- `teacher/discipline/page.tsx`: replace `execute({})` with: read the
  caller's homeroom classes (same call `makeLeaveDecisionAuthContext()` makes
  — call the SAME `makeListMyTeacherClassesUseCase()` read directly here,
  filter `roles.includes("homeroom")`), `Promise.allSettled` one
  `execute({classId, className: cls.name})` per homeroom class, flatten the
  fulfilled results, silently drop a rejected one (matches this page's
  existing whole-`Promise.all`-failure posture — one class's failure must not
  blank the other two tabs' worth of data the same fetch is not even
  responsible for). Zero homeroom classes → `leaveRequests = []` (same
  empty-state UI, now for a truthful reason instead of a refused call).
- `principal/discipline/page.tsx`: same shape, fan-out set = every class from
  `makePrincipalClassesRepository().listClasses({academicYear, limit: 100})`
  (drain `hasMore`/`nextCursor` before fanning out — `resolveCurrentAcademicYear()`
  already used by `(app)/principal/classes/page.tsx`, reused not duplicated).
- Both pages keep their existing `try/catch` around the `Promise.all([...])`
  for violations/conductSummary (untouched) — only the leave read moves to
  the settle-per-class shape described above.

### Fix — #8 (`leave-tab.tsx`)

- Mirror the EXISTING `isTeacher = vm.viewerRole === "teacher"` gate pattern
  already used in the sibling `violations-tab.tsx` (`isTeacher && !showForm`,
  `isTeacher && (…delete button…)`) — same feature, same VM, same idiom,
  reused not reinvented.
- Wrap the pending-row action block (`Button` approve + `Button` reject, the
  two `aria-label`s, the whole `<div className="flex gap-1.5">`) in
  `isTeacher &&`. A principal viewing a pending row sees the status badge and
  no action affordance — no explanatory notice text needed (the sibling
  `violations-tab.tsx` precedent doesn't add one either for its own
  teacher-only controls; consistency over inventing new copy for this one
  case).
- The `ReasonConfirmDialog` for reject stays mounted unconditionally (it is
  already inert when `rejectTarget` is null — no principal code path can ever
  set it since the trigger button is gone).

### Fix — #12 (form consolidation)

- `components/shared/leave-request-dialog/leave-request-dialog.tsx`: add one
  new optional prop `showAttachments?: boolean` (default `true`, preserves
  `parent-attendance-screen.tsx`'s existing behavior exactly). When `false`,
  omit the file-input block entirely and always call `onSubmit` with
  `files: []` — required because neither legacy submit path
  (`submitLeaveForChild`/`submitLeaveRequest`, both permanently mock-routed
  via `makeRepo()`) has an attachment-upload use-case wired; showing the
  picker without a consumer would silently drop picked files, which is the
  exact "present-but-dead control" ADR `0067` already forbids.
- `parent-discipline/components/LeaveRequestForm.tsx`: replace the inline
  react-hook-form/zod card with the SAME CTA-button + controlled-dialog
  pattern `parent-attendance-screen.tsx` already establishes for the
  canonical dialog (`ctaRef`/`returnFocusRef` + `open` state) — mount
  `<LeaveRequestDialog showAttachments={false} .../>`. Drop the `type` Select
  entirely; `onSubmit` always sets `type: "other"` on the
  `SubmitChildLeaveRequestInput` it builds (matches the REAL mapper's own
  convention for this fabricated field — `leave-request.mapper.ts:67-68`,
  "core has no student leave-type concept at all → always `other`" — the
  legacy self-service write path adopts the exact same convention the real
  read path already established). Keep `submitAction`/`onSubmitted` prop
  signatures UNCHANGED — `ParentDisciplineScreen.tsx` needs no edit.
- `student-conduct-screen/components/leave-request-sheet.tsx`: same
  treatment (drop Sheet, drop `type` Select, default `type: "other"`). Rename
  the file to `leave-request-trigger.tsx` (it no longer wraps a `Sheet` — the
  old name would mislead) and update its one import site
  (`student-conduct-screen.tsx`) + its story + its test file. Grep for
  `LeaveRequestSheet`/`leave-request-sheet` before finishing to confirm no
  orphaned reference remains.
- Domain types (`SubmitChildLeaveRequestInput`, `SubmitLeaveRequestInput`,
  their use-cases, the `MIN_REASON_LENGTH = 10` server-side rule) are
  UNCHANGED — this item is a presentation-layer consolidation, not a domain
  contract change. The client no longer PRE-validates the 10-char minimum
  (the canonical dialog only checks non-empty/≤500); a too-short reason now
  surfaces via the existing `errorMessage`/`role="alert"` path when the
  use-case rejects it server-side (`reason-too-short`, already translated via
  `discipline.errors`). This is an accepted minor UX trade (one extra
  round-trip on a rare input) in exchange for removing two duplicate custom
  forms — flagged here, not silently absorbed.
- `LeaveType`/`types.*` i18n keys (`discipline.studentConduct.leaveRequest.types.*`)
  are KEPT — they are still read by `LeaveHistorySection.tsx` /
  `leave-history-list.tsx` to label each history row's (now-always-`"other"`,
  for new submissions) `type` field. Only the SUBMIT-time `type` FIELD LABEL
  key (`discipline.studentConduct.leaveRequest.type`, singular) becomes
  orphaned once both Selects are removed — verified (grep) it has no other
  consumer — delete it from both `vi.json`/`en.json` in the same commit.

## Relevant Product Docs

- `docs/product/design-system.md` — no new token; `LeaveRequestDialog` already
  tokens-only compliant, reused as-is.
- `docs/decisions/0063-*.md` (repository-boundary `authCtx`, cited not
  re-derived — #8 does not touch authorization, only the UI reflection of an
  authorization outcome that already existed).
- `docs/decisions/0067-*.md` (feed hybrid honest-degrade idiom — cited
  precedent for "gate the affordance, don't let it 403 silently").
- `docs/stories/epics/E24-learning-class-hub/US-E24.6-student-parent-attendance-portal/`
  (canonical `LeaveRequestDialog` origin + `parent-attendance-screen.tsx`
  consumer pattern reused for #12).
- `docs/stories/epics/E24-learning-class-hub/US-E24.11-homeroom-tab/`
  (un-force-mocked `getLeaveRequests`/`approveLeave`/`rejectLeave`, `authCtx`
  wiring — read, not changed, by #5/#8).

## Acceptance Criteria

- #5: In real mode, `teacher/discipline`'s "leave" tab shows the SUBMITTED
  leave requests for every class where the signed-in teacher is GVCN
  (homeroom), each row's class label populated (not blank); zero homeroom
  classes → empty state, no thrown/uncaught error. `principal/discipline`'s
  "leave" tab shows leave requests (all states) across every class in the
  tenant, each row's class label populated; a single class's fetch failing
  does not blank the rest. Mock mode behavior is unchanged (still
  `MockDisciplineRepository`, unaffected by this fan-out — it already ignores
  `classId` filtering to some degree per its own doc).
- #8: In `principal/discipline`'s "leave" tab, no pending row shows an
  approve/reject button (principal `viewerRole`); `teacher/discipline`'s
  pending rows still show both buttons and both still function exactly as
  before (US-E24.11 regression-free). No console/toast "forbidden" error is
  ever reachable for a principal viewer through this UI.
  `academic/no relevant regression in `violations-tab.tsx`'s own gate (untouched
  file).
- #12: `ParentDisciplineScreen`'s leave-request CTA opens the canonical
  `LeaveRequestDialog` (Dialog, not inline card) with no leave-type field; a
  successful submit still shows the existing success banner
  (`successParent`) unchanged. `StudentConductScreen`'s leave-request CTA
  opens the same canonical dialog (Dialog, not Sheet) with no leave-type
  field; a successful submit still shows the existing `t("success")` toast
  unchanged. Neither dialog instance shows an attachment picker
  (`showAttachments={false}`). The parent-attendance-screen's existing
  `LeaveRequestDialog` usage (WITH attachments) is pixel/behavior-unchanged.
  No remaining reference to `LeaveRequestSheet`/`leave-request-sheet.tsx`
  anywhere in `src/`.

## Design Notes

- Commands: none (no new mutation — #5 is a read fan-out, #8 removes a
  button, #12 re-skins two existing submit flows onto an existing dialog).
- Queries: `getLeaveRequests({classId, className?})` — signature extended,
  not replaced.
- API: no new endpoint; reuses `GET /student-leave-requests?classId=` (already
  wired, US-E24.11) and `GET /classes` (already wired, US-E13.8/US-E18.30, via
  `makePrincipalClassesRepository`) and `makeListMyTeacherClassesUseCase()`
  (already wired).
- Tables: n/a.
- Domain rules: none changed — `canDecideLeave`, `MIN_REASON_LENGTH`,
  `assertCanDecideLeave` all untouched.
- UI surfaces: `teacher/discipline` leave tab, `principal/discipline` leave
  tab, parent-discipline screen leave CTA, student-conduct screen leave CTA.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `discipline.repository.test.ts` (className passthrough); use-case tests unaffected (signature is additive); new/updated component tests for `LeaveTab` (principal hides actions, teacher unchanged), `LeaveRequestForm`/renamed trigger component (no type field, `type:"other"` sent, attachments hidden), `LeaveRequestDialog` (`showAttachments={false}` hides the file input). |
| Integration | n/a beyond the above (no new HTTP contract). |
| E2E | Story/interaction coverage: `discipline-screen.stories.tsx` or `leave-tab` story asserting no approve/reject for `viewerRole="principal"`; `ParentDisciplineScreen`/`student-conduct-screen` stories asserting the dialog (not inline form/Sheet) opens and has no type select. |
| Platform | `bunx tsc --noEmit`, `bun lint`, `bun vitest run`, `bun vitest --config vitest.storybook.mts run`, `NEXT_PUBLIC_USE_MOCK=true bun run build` all clean. |
| Release | design-review gate (`docs/DESIGN_REVIEW.md`) PASS — #8 and #12 both change UI; `/impeccable audit` run; a11y audit (button removal + Dialog conversion both worth a keyboard/focus check). |

## Harness Delta

- Backlog #5, #8, #12 closed via `harness-cli backlog close` once implemented
  + proven.
- `docs/TEST_MATRIX.md` — new row for US-E24.20, `planned` → `implemented`.
- No ADR expected (no new token, no architecture/auth decision — #8 reflects
  an existing BE rule in the UI, it does not create one). Will register one
  only if the engineer/reviewer surfaces a genuine design-system or
  architecture decision during implementation.
- Note (not a new backlog item, a documented risk): `principal/discipline`'s
  leave-tab fan-out cost scales with tenant class count (N HTTP round-trips,
  no bulk endpoint exists). Acceptable for MVP; a bulk
  `GET /student-leave-requests?classIds=` (or a tenant-wide BGH variant with
  no `classId` at all, mirroring the `listByStudent` BGH branch which already
  drops the per-student restriction) would remove this — logged here as a
  candidate cross-repo ask if it proves slow in practice, NOT filed as a
  backlog item pre-emptively (no evidence yet that it is actually slow).

## Evidence

(Filled in after implementation — branch `fix/us-e24.20-backlog-batch6-leave-consolidation`.)
