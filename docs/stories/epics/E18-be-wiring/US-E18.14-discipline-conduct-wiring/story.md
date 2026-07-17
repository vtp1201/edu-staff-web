# US-E18.14 Discipline → conduct remap

## Status

implemented

## Lane

high-risk (per epic table). Hard-gate flags evaluated: no auth/token/session
change; no tenant-isolation change (role-scoping stays server-enforced exactly
as documented); **no new design-system token**; **no UI/behavior change**
(zero regression AC, matching every other Wave-3 "blocked" precedent —
US-E18.8/US-E18.9/US-E18.13's unseal workflow). The "high-risk" label in the
epic table anticipated a live student/staff-violation + conduct-grade
workflow UI rebuild; the ground-truth audit below found that is **not
achievable** with the real contract as it stands (see "Why the whole feature
stays mock-first"), so the actual delta is a repository/DTO/error-taxonomy/DI
remap — same shape and risk profile as US-E18.8. Kept the high-risk lane
label per the epic table's original scoping (not downgraded), since the
audit itself constitutes the high-risk analysis this lane exists to force.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched: `src/features/discipline/`,
  `src/bootstrap/{endpoint,di}/discipline.di.ts` (+ new
  `discipline.endpoint.ts` remap)
- Shared contract/file: none (no other in-flight US touches
  `features/discipline`; `staff-leave` is a separate, already-implemented
  feature — US-E18.8 — sharing the same BE `conduct` domain's error taxonomy
  but no code)

## Product Contract

Ground-truthed against `edu-api/services/core/internal/conduct/**`
(`adapter/http/routes.go`, `adapter/http/dto/*.go`,
`core/application/usecase/*.go`, `core/domain/error/*.go`,
`core/domain/service/approval_transition.go`,
`pkg/kit/response/error.go`'s `codeFromKey`) — not just
`docs/openapi.yaml`/`ERROR_CODES.md` prose, per epic playbook step 1.

### Real contract — 6 sub-resources under `/api/v1/conduct/*`

All routes require `RequireAuth`; Kong strips `/core` so the client path is
`/core/api/v1/conduct/...`.

1. **`student-violations`** (used by web's `violations-tab.tsx`,
   `my-violations-list.tsx`, `ViolationsList.tsx`):
   `POST /` create (DRAFT, GVCN), `GET /?classId=` list (role-scoped:
   BGH=full class, GVCN=own class, STUDENT/PARENT=own records only, cursor
   pagination), `PATCH /:id` edit (author only), `POST /:id/submit`,
   `POST /:id/approve`, `POST /:id/reject` (body `{ rejectionReason }`).
   `StudentViolationResponse`: `recordId`, `classId`, `studentMemberId`,
   `category`, `description`, `severity` (`MINOR`/`MODERATE`/`SEVERE`),
   `occurredAt`, `state` (`DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`),
   `authorMemberId`, `approverMemberId?`, `rejectionReason?`, `createdAt`,
   `updatedAt`. **Zero display fields** (no `studentName`/`className`/
   `handledBy`) — same gap class as ask #6/#7/#9/#13.
2. **`student-conduct-grades`** (used by web's `conduct-tab.tsx`
   `overrideConductGrade`, `conduct-summary-card.tsx`): `POST /` set
   (create/overwrite DRAFT, GVCN), `GET /?classId=&termId=` list, `POST
   /:studentMemberId/submit?classId=&termId=`, `.../approve`,
   `.../reject` (body `{ reason }`, mandatory). `StudentConductGradeResponse`:
   `classId`, `termId`, `studentMemberId`, `grade`
   (`TOT`/`KHA`/`TRUNG_BINH`/`YEU`), `comment`, `state`, `authorMemberId`,
   `approverMemberId?`, `rejectionReason?`, timestamps. **Zero display
   fields**, and **no "override" concept at all** — web's single-action
   `overrideConductGrade(studentId, grade, note)` (PUT, principal-only,
   immediate) has no real equivalent; the real model is GVCN-authored
   DRAFT→SUBMIT→BGH APPROVE/REJECT, i.e. an entirely different actor/workflow
   shape, not a drop-in remap.
3. **`student-leave-requests`** (used by `leave-tab.tsx`,
   `LeaveRequestForm.tsx`, `leave-request-sheet.tsx`): `POST /` submit
   (STUDENT self / linked PARENT, straight to SUBMITTED — no DRAFT), `GET
   /?studentMemberId=|classId=` (mutually exclusive; `classId` scope for
   GVCN returns only the SUBMITTED inbox, BGH gets all states), `POST
   /:id/approve?studentMemberId=`, `POST /:id/reject?studentMemberId=` (body
   `{ rejectionReason }`, mandatory). `StudentLeaveRequestResponse`:
   `requestId`, `studentMemberId`, `classId`, `startDate`/`endDate` (ISO
   date), `reason`, `state`, `submittedByMemberId`, `approverMemberId?`,
   `rejectionReason?`, timestamps. **Zero display fields** + **no leave-type
   concept** (only free-text `reason`, same gap class as ask #13 for staff
   leave) + `POST` body **requires `classId` as a mandatory field**.
4. **`staff-violations`** — no equivalent web screen exists (web's
   discipline feature is 100% student-scoped; there is no "staff violation"
   entity/UI anywhere in the codebase). Out of scope — see "Descoped, not a
   BE gap" below.
5. **`staff-conduct-notes`** — same, no web screen exists. Out of scope.
6. **`student-absences`** (incl. `POST /:date/flag`) — no web screen exists
   (web's discipline feature has no absence-tracking concept at all — that
   lives in the separate `attendance` feature, which is period/date-based
   attendance marking, not this excused/unexcused-absence conduct record).
   Out of scope.

### Error taxonomy (ground-truthed, `codeFromKey` uppercases the i18n
message key — confirms decision `0008` UPPER_SNAKE holds for `core`, same as
every prior Wave 1/2/3 `core` cluster)

Shared `ApprovalTransition` domain service (`approval_transition.go`) is
reused by violations, conduct-grades, and leave requests alike (confirmed by
reading `approve_student_violation.go` + `approve_student_conduct_grade.go`
side-by-side — both call the exact same `service.ApprovalTransition{}.Approve`
and raise the exact same `violation_*`-prefixed errors regardless of resource
— this is not a naming accident, it's one shared state machine, ADR `0073`).
Full matrix:

| Code | Status | Source |
| --- | --- | --- |
| `VIOLATION_NOT_FOUND` | 404 | violation.go |
| `VIOLATION_FORBIDDEN` | 403 | violation.go (role/relationship) |
| `VIOLATION_SAME_ACTOR` | 409 | approval_transition.go (ADR 0073 distinct-actor) |
| `VIOLATION_INVALID_TRANSITION` | 409 | approval_transition.go (shared, ALL resources) |
| `VIOLATION_REJECTION_REASON_REQUIRED` | 422 | approval_transition.go (shared, ALL resources) |
| `VIOLATION_INVALID_ID` | 400 | violation.go (domain backstop) |
| `VIOLATION_INVALID_SEVERITY` | 422 | violation.go |
| `VIOLATION_INVALID_STATE` | 400 | violation.go |
| `VIOLATION_INVALID_INPUT` | 422 | violation.go |
| `CONDUCT_GRADE_NOT_FOUND` | 404 | conduct_grade.go |
| `CONDUCT_GRADE_FORBIDDEN` | 403 | conduct_grade.go |
| `CONDUCT_GRADE_INVALID_GRADE` | 422 | conduct_grade.go |
| `CONDUCT_GRADE_LOCKED` | 409 | conduct_grade.go (ADR 0074, re-set after APPROVED forbidden) |
| `CONDUCT_GRADE_TERM_NOT_FOUND` | 404 | conduct_grade.go |
| `LEAVE_REQUEST_NOT_FOUND` | 404 | leave.go |
| `LEAVE_REQUEST_FORBIDDEN` | 403 | leave.go |
| `LEAVE_REQUEST_INVALID_DATE_RANGE` | 400 | leave.go |
| `LEAVE_REQUEST_INVALID_INPUT` | 400 | leave.go |
| `LEAVE_REQUEST_STUDENT_NOT_ENROLLED` | 403 | leave.go |

### Why the whole feature stays mock-first (not a partial/hybrid wiring)

Two independent, categorical blockers — each already flagged once in the
epic (ask #7/#9 and ask #15) — compound here to block **every** operation,
not a subset:

1. **No real student-roster UUIDs.** Every real endpoint keys on
   `studentMemberId` (a real IAM/core UUID). The web roster is mock-first
   permanently (US-E18.5, ask #9 — `EnrollmentResponse` has no display
   fields and there's no `/students/unassigned` endpoint). Any
   admin/teacher-authored record (`recordViolation`, `overrideConductGrade`'s
   real equivalent) would need to address a real student by UUID that the
   web has no way to look up — same reasoning that force-mocked
   `staff-leave` (US-E18.8) and `class-management.listTeachers` (US-E18.4).
2. **[NEW finding, extends ask #15] No self-scope discovery for STUDENT,
   not just PARENT.** Ask #15 (US-E18.11) documented that PARENT has no way
   to resolve a linked child's `classId`. Reading the conduct list
   use-cases here (`list_student_violations.go`,
   `list_student_conduct_grades.go`) found the **same gap also blocks the
   STUDENT's own self-view**: `ListStudentViolationsUseCase`/
   `ListStudentConductGradesUseCase` **require `classId` in every call, even
   for the STUDENT's own-record-only branch** (`ownOnly` just filters the
   class-scoped page post-query — it does not remove the `classId`
   requirement). `POST /student-leave-requests` similarly requires `classId`
   as a mandatory body field even for self-submit. Ask #15 established "no
   STUDENT/PARENT self-scope discovery endpoint exists for classId" for
   *cross-referencing a child*; this confirms the identical gap blocks a
   STUDENT looking up **their own** classId too — there is no
   `GET /members/{id}/enrollment`-equivalent callable by STUDENT at all.
   This means self-service (`getMyViolations`/`getMyConductSummary`/
   `getMyLeaveRequests`/`submitLeaveRequest`) — the one category of
   operation in this feature that doesn't depend on the roster gap (a
   student always has a real, session-derived own `memberId`) — is
   *independently* blocked by the classId gap. Combined with (1) blocking
   every admin/teacher-authored operation, **no operation in this feature
   can go real today**.

Decision (mirrors US-E18.8's force-mock pattern, the established precedent
for "every operation blocked"): `DisciplineRepository` (real class)
implements the corrected path/DTO/error-taxonomy shape (kept accurate +
unit-tested for the day this unblocks) but `discipline.di.ts` **force-mocks
regardless of `USE_MOCK`** — the third fully-blocked DI factory in the epic
after `staff-leave.di.ts` (US-E18.8) and `teaching-plan.di.ts` (US-E18.9).

### Descoped, not a BE gap: staff-violations / staff-conduct-notes /
student-absences

Per the epic's Design Source directive ("không có màn mới"), and confirmed
by grep across `src/features/` + `src/app/` finding zero staff-violation,
staff-conduct-note, or student-absence UI anywhere in the web codebase,
these three real sub-resources are **not implemented and out of scope for
`/fe`** — this is a product/design gap (no screen has ever been designed for
them), not a BE gap (BE already ships the full contract). Flagged for
`/uiux`+`/ba` if a future epic wants a staff discipline screen or an
absence-tracking screen distinct from the existing period-based
`attendance` feature — mirrors how US-E18.9 flagged the teaching-plan
term/period modeling gap as a `uiux`/`ba` matter, not resolvable by `fe`
alone.

## Relevant Product Docs

- `docs/product/screens.md` (Discipline — teacher/principal/student/parent) —
  unchanged, no UI change.
- `docs/DESIGN_REVIEW.md` — gate not triggered (no UI/token change).

## Acceptance Criteria

- `DISCIPLINE_EP` remapped to the real `/core/api/v1/conduct/student-*`
  paths (documented for the day this unblocks), even though the real
  repository no longer calls them for data ops.
- `DisciplineFailure` extended with the full ground-truthed error matrix
  above; new types added with vi/en i18n keys (`same-actor`,
  `invalid-transition`, `locked`, `student-not-enrolled`, `invalid-date-range`
  if not already covered by existing types — reconcile against the existing
  union, don't duplicate `already-processed`/`forbidden`/`invalid-child`/etc
  where an existing type already covers the same shape).
- `DisciplineRepository` (real): `toFailure` ground-truthed + unit-tested
  against the full matrix; every method is a documented permanent stub
  (never calls `http.*`).
- `discipline.di.ts`: force-mocks regardless of `USE_MOCK`, documented why
  (mirrors `staff-leave.di.ts`, US-E18.8).
- Zero UI/ViewModel/screen-behavior change — mock repo, fixtures, entities,
  use-cases, and every presentation component (`violations-tab`,
  `conduct-tab`, `leave-tab`, parent/student screens) stay byte-for-byte
  behaviorally identical.
- Zero regression on the existing suite; `tsc --noEmit` clean; `bun build`
  green.

## Design Notes

- Commands: none (no Server Action signature change).
- Queries: none (no use-case signature change).
- API: see "Real contract" above — recorded, not consumed (blocked).
- Domain rules: no domain/use-case/entity change — only
  `infrastructure/repositories/discipline.repository.ts`,
  `infrastructure/repositories/discipline.repository.test.ts`,
  `domain/failures/discipline.failure.ts`, `bootstrap/endpoint/discipline.endpoint.ts`,
  `bootstrap/di/discipline.di.ts`, i18n messages.
- UI surfaces: none touched.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `discipline.repository.test.ts` — `toFailure` full ground-truthed matrix (19 codes + network-error fallback); every real-repo method asserted to return/throw a failure without ever calling `http.*`. |
| Integration | n/a — no real HTTP path is reachable by design (force-mocked DI); existing `MockDisciplineRepository` + use-case tests continue to pass unchanged. |
| E2E | n/a — no UI/behavior change; existing Storybook stories for all 4 discipline screens continue to pass unchanged. |
| Platform | `bunx tsc --noEmit` clean; `bun run build` green; full vitest suite zero-regression vs pre-US baseline. |

## Harness Delta

- `docs/TEST_MATRIX.md` — new row for US-E18.14.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — cross-repo finding
  logged (ask #22: classId self-discovery gap, ask #15, also blocks STUDENT
  self-view, not just PARENT — the 9th confirmation of this gap family and
  the first to block self-service, not just oversight); Wave-3 table note
  updated with the real finding.
- `scripts/bin/harness-cli story update --id US-E18.14 --status implemented --unit 1 --integration 0 --e2e 0 --platform 1` (run after proof).

## Evidence

- `bun vitest run`: 303 files / 1902 tests pass (zero regression vs pre-US
  baseline 303/1866, +36 new tests, same file count).
- `bunx tsc --noEmit`: clean.
- `bun run build`: green.
- `bun lint`: clean on touched files.
- `fe-tech-lead-reviewer`: **APPROVED** — independently ground-truthed the
  force-mock premise against `edu-api`'s Go source (confirmed `classId` is
  genuinely mandatory on the STUDENT-self branch of
  `ListStudentViolationsUseCase`/`ListStudentConductGradesUseCase`, and on
  `CreateStudentLeaveRequestRequest`; no live real-branch contradicts the
  stub claim — the US-E18.12-class failure mode this check exists to catch).
  0 blocking findings; 2 non-blocking CONSIDER notes (a slightly-stale
  parent-linkage comment in `discipline.endpoint.ts`, and two
  error-message-length judgment calls in `toFailure`) — the comment was
  tightened same-branch, the judgment calls left as documented (mirrors
  US-E18.8 precedent, acceptable while force-mocked).
- Design-review + a11y gates: not triggered (zero UI surface, mirrors
  US-E18.8/US-E18.9).
- QA gate: n/a (no UI/behavior change, existing Storybook stories for all 4
  discipline screens pass unchanged, mirrors US-E18.8/US-E18.9).

See merge commit `chore(discipline): merge feat/us-e18.14-discipline-conduct-wiring (US-E18.14)`
for the full test run output.
