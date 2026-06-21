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
