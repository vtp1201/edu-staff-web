# US-E18.8 Staff-leave wiring

## Status

implemented

## Lane

normal (upgraded from the epic table's "tiny" — the "add `/conduct/` segment"
label held only at the path level; the DTO-shape + capability audit found the
same depth of drift as every other Wave 1/2 cluster in this epic. No hard-gate
flag trips: no auth/RBAC/token/session/tenant-isolation/data-loss/PII/
validation-weakening/new-design-token change — behavior stays server-boundary
internal, screen UI is unchanged.)

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/staff-leave/`,
  `src/bootstrap/{endpoint,di}/staff-leave.*`
- Shared contract/file: none (no other US touches `staff-leave`)

## Product Contract

Ground-truth the real `core` contract for staff-leave requests
(`edu-api/services/core/docs/openapi.yaml` `/api/v1/conduct/staff-leave-requests*`
+ Go source `internal/conduct/adapter/http/staff_leave_request_handler.go` +
`internal/conduct/core/domain/error/leave.go` + `pkg/kit/response/error.go`)
and remap the web repository/endpoint/error-taxonomy to match. Per the epic's
zero-regression AC, the admin staff-leave screen (tenant-wide oversight list +
approve/reject) keeps its exact current behavior — **the real answer here is
that it cannot be wired at all, and must stay mock-first permanently.**

### Real contract (ground-truthed, not just the openapi prose)

- `POST /api/v1/conduct/staff-leave-requests` — submit (self-service only, no
  `staffMemberId` field — always the caller's own memberId). **Not used by
  this web screen** (admin-only approve/reject inbox, no self-service submit
  UI exists) — noted, not implemented.
- `GET /api/v1/conduct/staff-leave-requests?staffMemberId=&cursor=&limit=` —
  list. `staffMemberId` is a **required** query param (table partitions on
  `(tenantId, staffMemberId)`) — **there is no tenant-wide oversight list**.
  ADMIN/MANAGER may list *one* staff member's requests per call, never "all
  pending requests across the tenant" in one round-trip.
- `POST /api/v1/conduct/staff-leave-requests/{id}/approve?staffMemberId=` —
  approve (ADMIN/MANAGER, distinct-actor rule ADR 0073 — `409 VIOLATION_SAME_ACTOR`
  unless single-admin-tenant fallback, then `selfApproved: true`).
- `POST /api/v1/conduct/staff-leave-requests/{id}/reject?staffMemberId=` —
  reject, body `{ rejectionReason }` (NOT `reason`).
- `StaffLeaveRequestResponse`: `requestId`, `staffMemberId`, `startDate`,
  `endDate`, `reason`, `state` (`SUBMITTED`/`APPROVED`/`REJECTED`),
  `approverMemberId`, `selfApproved`, `rejectionReason`, `createdAt`,
  `updatedAt`. **Zero display fields** — no `staffName`, no `department`, no
  `leaveType` (the leave-*type* concept — annual/sick/personal/family —
  does not exist on the wire at all, only free-text `reason`), no
  `submittedAt`/`approvedBy`/`approvedAt`/`rejectedBy`/`rejectedAt` (only
  `createdAt`/`updatedAt` + `approverMemberId` as a raw id).
- Error taxonomy (ground-truthed from
  `internal/conduct/core/application/usecase/{approve,reject,list}_staff_leave_request*.go`
  + `pkg/kit/response/error.go`'s `codeFromKey` — confirms decision `0008`
  UPPER_SNAKE holds for `core`, same as US-E18.1/.2/.6/.7):
  `LEAVE_REQUEST_NOT_FOUND` (404), `VIOLATION_FORBIDDEN` (403 — all three of
  `list`/`approve`/`reject` call the shared `ApprovalTransition` domain
  service's `ErrViolationForbidden()`; `LEAVE_REQUEST_FORBIDDEN` is emitted
  only by `submit_staff_leave_request.go`'s self-service path, which this
  repository never calls, but is mapped too for completeness — tech-lead
  review round 1 caught this mismap, fixed same-commit),
  `LEAVE_REQUEST_INVALID_DATE_RANGE` (400, submit-only),
  `LEAVE_REQUEST_INVALID_INPUT` (422), `VIOLATION_SAME_ACTOR` (409, approve
  distinct-actor rule), `VIOLATION_INVALID_TRANSITION` (409),
  `VIOLATION_REJECTION_REASON_REQUIRED` (422).

### Why the whole feature stays mock-first (not a partial/hybrid wiring)

Unlike US-E18.5 (roster) / US-E18.4 (class-management), where SOME operations
could go real while others stayed mock, staff-leave has **no operation that
can go real for this screen**:

1. **No tenant-wide list.** The admin screen lists every staff member's
   pending/approved/rejected requests at once (`GetStaffLeaveRequestsUseCase`
   takes only an optional `status` filter — no `staffMemberId`). The real API
   requires a `staffMemberId` per call and enumerating "every staff member in
   the tenant" is independently blocked — IAM has no member-listing endpoint
   on the public API at all (cross-repo ask #7, confirmed in US-E18.4).
2. **Even a single-member list would be unusable.** `StaffLeaveRequestResponse`
   carries zero of the fields the card UI renders (`staffName`, `initials`,
   `department`, `leaveType`, `days`, `submittedAt`, `approvedBy`/`rejectedBy`
   display names) — and there is no IAM batch/by-id profile lookup to
   backfill a display name from `staffMemberId` (cross-repo ask #6/#7,
   confirmed again here — 4th cluster to hit this exact gap).
3. Because (1)+(2) block `listRequests` entirely, `approve`/`reject` are also
   unreachable in practice: the only source of a `(id, staffMemberId)` pair
   the UI ever has is a list response, and that list is mock-sourced — a mock
   UUID will never resolve against the real BE, so wiring approve/reject
   "for real" while list stays mock would just always 404 in production.

Decision: `StaffLeaveRepository` (real class) implements the corrected error
taxonomy (kept accurate + tested, ready for the day BE unblocks this) but all
three methods are permanent blocked stubs (mirrors
`ClassManagementRepository.listTeachers()`, US-E18.4) — never invoked because
`staff-leave.di.ts` now **force-mocks regardless of `USE_MOCK`** (new pattern
in this epic: previous "permanently mock" cases were hybrid/partial —
`admin-roster.di.ts`/`class-management.di.ts` — this is the first fully-blocked
factory, guarding against the day the app-wide `USE_MOCK` flag flips to
`false` and silently breaking this screen).

Two new failure types added for taxonomy completeness (`forbidden`,
`same-actor`) even though unreachable today — cheap correctness for whenever
this unblocks, i18n keys added both languages.

## Relevant Product Docs

- `docs/product/screens.md` (Staff Leave, admin) — unchanged, no UI change.
- `docs/DESIGN_REVIEW.md` — gate not triggered (no UI/token change).

## Acceptance Criteria

- `STAFF_LEAVE_EP` reflects the real paths (`/conduct/` segment, `/approve`
  `/reject` POST not PUT) for documentation, even though the real repository
  no longer calls them (kept for the day this unblocks).
- `StaffLeaveFailure` maps the full ground-truthed error matrix; two new types
  (`forbidden`, `same-actor`) added with vi/en i18n keys.
- `StaffLeaveRepository` (real): `toFailure` ground-truthed and unit-tested;
  `listRequests`/`approve`/`reject` are documented permanent stubs.
- `staff-leave.di.ts`: force-mocks regardless of `USE_MOCK`, documented why.
- Zero UI/ViewModel/screen-behavior change (mock repo unchanged, screen still
  reads exactly the same mock data as before this US).
- Zero regression on the existing suite; `tsc --noEmit` clean; `bun build` green.

## Design Notes

- Commands: none (no Server Action signature change — `approve`/`reject`
  actions still call the same use-case interface; only the DI wiring under
  them force-mocks now instead of conditionally mocking).
- Queries: `listRequests` unchanged signature.
- API: see "Real contract" above — recorded, not consumed (blocked).
- Tables: n/a (web has no direct DB access).
- Domain rules: no domain/use-case/entity change — only
  `infrastructure/repositories/staff-leave.repository.ts`,
  `domain/failures/staff-leave.failure.ts`, `bootstrap/endpoint/staff-leave.endpoint.ts`,
  `bootstrap/di/staff-leave.di.ts`, i18n messages.
- UI surfaces: none touched.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `staff-leave.repository.test.ts` (new) — `toFailure` full ground-truthed matrix (7 codes + network-error fallback); stub methods return a failure, never call `http.*`. |
| Integration | n/a — no real HTTP path is reachable by design (force-mocked DI); existing use-case tests against `IStaffLeaveRepository` mock continue to pass unchanged. |
| E2E | n/a — no UI/behavior change, existing Storybook stories for the screen continue to pass unchanged. |
| Platform | `bunx tsc --noEmit` clean; `bun run build` green; full vitest suite zero-regression vs baseline. |

## Harness Delta

- `docs/TEST_MATRIX.md` — new row for US-E18.8.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — cross-repo ask #13
  logged (staff-leave has no tenant-wide list + zero display fields on
  `StaffLeaveRequestResponse`, compounding asks #6/#7); Wave-2 table note
  updated to reflect the real finding (not just "add `/conduct/` segment").
- `scripts/bin/harness-cli story update --id US-E18.8 --status implemented --unit 1 --integration 0 --e2e 0 --platform 1`.

## Evidence

See PR/merge commit `chore(staff-leave): merge feat/us-e18.8-staff-leave-wiring (US-E18.8)`
for the full test run output referenced below.
