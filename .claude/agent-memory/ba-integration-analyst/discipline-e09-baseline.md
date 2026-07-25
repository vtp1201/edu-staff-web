---
name: discipline-e09-baseline
description: Discipline feature (E09) — endpoint constants, mock patterns, failure codes, child-list ambiguity
metadata:
  type: project
---

## Existing endpoint constant file
`src/bootstrap/endpoint/discipline.endpoint.ts`

Existing keys (from US-E09.1 / E09.2):
- `violations`, `recordViolation` → `/core/api/v1/discipline/violations`
- `conduct` → `/core/api/v1/discipline/conduct`
- `overrideConduct(studentId)` → `/core/api/v1/discipline/conduct/${studentId}/override`
- `leaveRequests`, `submitLeaveRequest` → `/core/api/v1/discipline/leave-requests`
- `approveLeave(id)`, `rejectLeave(id)`
- `myConduct`, `myViolations`, `myLeaveRequests` (student self-service)

US-E09.4 adds (to be extended):
- `parentChildren` → `/core/api/v1/parent/children`
- `childConductSummary(childId)` → `/core/api/v1/discipline/children/${childId}/conduct-summary`
- `childViolations(childId)` → `/core/api/v1/discipline/children/${childId}/violations`
- `childLeaveRequests(childId)` → `/core/api/v1/discipline/children/${childId}/leave-requests`
- `submitChildLeaveRequest(childId)` → `/core/api/v1/discipline/children/${childId}/leave-requests`

## Mock repository
`MockDisciplineRepository` in `src/features/discipline/infrastructure/repositories/mock-discipline.repository.ts`
US-E09.4 extends it with child-scoped methods keyed by `childId`.

## Child-list ambiguity (shared with US-E13.7)
`GET /parent/children` service placement is unresolved: `core` vs `iam`.
Mapped under `core` in both E09.4 and E13.7 for now. Flag as OQ for a cross-story ADR (≥0023).
See [[grades-e13-baseline]] for the same open question.

## Conduct grade mapping
- `excellent` (≥90) → success
- `good` (≥70) → primary
- `average` (≥50) → warning
- `weak` (<50) → error

## Leave request status badge mapping
- `pending` → warning
- `approved` → success
- `rejected` → error (+ show `rejectedReason` field in error-toned text)

## Key failure codes for discipline endpoints
- `CHILD_NOT_FOUND` 404 → not-found → inline error, no retry
- `FORBIDDEN` 403 → forbidden → inline/toast, no retry
- `LEAVE_REQUEST_INVALID` 422 → validation-error → form-level inline error
- `DUPLICATE_LEAVE_REQUEST` 409 → conflict → toast warning, no retry
- `VALIDATION_ERROR` 422 → validation-error → per-field via error.fields[]

**Why:** core service not built; mock-first until it ships (decision 0014).
**How to apply:** always flag all 5 discipline/parent endpoints as mock-first. Child-list shares same service ambiguity as grades E13.7 — always cross-reference.

## US-E09.5 Staff Discipline (violations + conduct notes) — "real contract, roster-blocked" classification

DR-022 ground-truthed 10 endpoints (`POST/GET/:id/submit/approve/reject` for
`staff-violations`; `POST/GET/:staffMemberId/submit/approve/reject?termId=`
for `staff-conduct-notes`) directly against edu-api Go source
(`core/internal/conduct/adapter/http/{routes.go,dto/staff_violation.go,
dto/staff_conduct_note.go}`) — these ARE real and shipped, unlike most
`core` stories where the service doesn't exist. Mock-first classification
here is for a DIFFERENT reason than usual: no web roster-search endpoint
resolves `staffMemberId` UUID → display name, and neither response carries
`staffName`/`department`. Same "real-contract-but-roster-blocked" precedent
as US-E18.8 staff-leave and this feature's own student-violations/
student-conduct-grades tracks (`DISCIPLINE_EP`, force-mocked DI regardless
of `NEXT_PUBLIC_USE_MOCK`). **When classifying `core` conduct-domain
endpoints, always check for this distinction before defaulting to
"core doesn't exist yet."**

Role remap (ADR 0062): BE's `ADMIN` (author) + `MANAGER` (approver) BOTH
collapse onto this app's single `principal` role (not the app's separate
`admin` route-guard role) — single-admin-tenant product. `teacher` = strict
read-only self-view, zero mutation. Routes:
`(app)/principal/staff-discipline`, `(app)/teacher/staff-discipline`
(supersedes DR-022's original `/admin/staff-discipline` draft).

`selfApproved` (ADR 0073) = audit-transparency field, must always render,
never hidden — appears whenever approverMemberId === authorMemberId (the
expected common case in a single-admin tenant, not an edge case).
`STAFF_CONDUCT_NOTE_LOCKED` 409 (ADR 0074) = genuine BE-enforced
immutability once a conduct note reaches APPROVED — client must pre-block
the set-form from even opening, server 409 is the backstop only.

Full integration map:
`docs/stories/epics/E09-discipline-conduct/US-E09.5-staff-discipline/integration.md`.

## US-E09.6 Student Absences — a DIFFERENT mock-first reason (real-contract, roster-blocked)

Ground-truthed directly against `edu-api/services/core/internal/conduct/adapter/http/
{routes.go, dto/student_absence.go, valueobject/absence_state.go}` (Go source, not
draft). All 4 endpoints (`POST /conduct/student-absences`, `GET ?classId=&from=&to=`,
`PATCH /:date?classId=&studentMemberId=`, `POST /:date/flag?...`) are REAL/SHIPPED —
NOT the usual "core doesn't exist" reason. Web is mock-first only because no
studentMemberId→display-name/className resolution exists on the wire (roster-UUID
gap, same class as staff-discipline US-E09.5, asks #9/#15/#22). DI factory should
force-mock regardless of `NEXT_PUBLIC_USE_MOCK` (same pattern as `discipline.di.ts`)
since the real repo is unreachable end-to-end today.

2-state one-way domain (`RECORDED → FLAGGED_UNEXCUSED`, terminal, no unflag) —
NOT the shared `ApprovalTransition`/DRAFT-SUBMITTED-APPROVED-REJECTED state machine
used by violations/conduct-grades/leave. Don't conflate the two shapes across sibling
stories in this epic.

`ABSENCE_INVALID_DATE` (422) rejects FUTURE dates — opposite direction from
`discipline.errors.invalid-date` (guards leave-request dates ≥ today). Keep these as
separate i18n/failure keys even though English labels look similar — a recurring trap
worth checking whenever a new discipline-adjacent absence/leave feature is mapped.

All 7 `ABSENCE_*` codes are genuinely new, zero reuse with `DisciplineFailure`.

Full map: `docs/stories/epics/E09-discipline-conduct/US-E09.6-student-absences/integration.md`.
