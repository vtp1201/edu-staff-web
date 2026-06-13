# US-E06.7 core — Wire Student Roster & Class Enrollment to Real BE

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E06.3 (base URL), US-E06.5 (academic-year context needed for class queries)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/roster/`
- Shared contract/file: `bootstrap/endpoint/admin-roster.endpoint.ts`,
  `bootstrap/di/roster.di.ts`

## Product Contract

Replace mock-first `RosterRepository` with real HTTP calls to the `core` service
(US-E12.4 already implemented as mock-first). This lifts the mock for:

**Classes:**
- `GET /core/api/v1/classes` — list classes (cursor-paginated, `?academicYear=2025-2026`)
- `GET /core/api/v1/classes/:classId` — get one class

**Student Roster:**
- `GET /core/api/v1/classes/:classId/students` — list enrolled students (cursor-paginated)
- `POST /core/api/v1/classes/:classId/students` — enroll a student
- `GET /core/api/v1/classes/:classId/students/:studentMemberId` — get one enrollment
- `DELETE /core/api/v1/classes/:classId/students/:studentMemberId` — unenroll a student

**Note on transfer:** There is no dedicated `POST /core/students/:studentId/transfer`
endpoint in the core service. Transfer is achieved by:
1. `DELETE` the student from the current class (unenroll)
2. `POST` the student to the new class (enroll)
The web app's transfer flow must be updated to use this two-step pattern.
Error `ROSTER_STUDENT_ALREADY_ENROLLED (409)` from the enroll call (when student is
already in a class for the year) is the business signal that informs the transfer-warning
UX — the `currentClassId` context must come from listing classes, not a dedicated
transfer API.

## Relevant Product Docs

- `edu-api/services/core/docs/INTEGRATION.md` — Student roster (US-043) section
- `edu-api/services/core/docs/openapi.yaml` — authoritative contract
- `docs/stories/epics/E12-admin-core/US-E12.4-student-roster.md` — mock-first impl
- `docs/decisions/0030-kong-gateway-base-url.md`

## Acceptance Criteria

### TR-031 — Real RosterRepository
- Lift mock in `features/admin/roster/infrastructure/repositories/roster.repository.ts`.
- `ClassDto`, `EnrollmentResponseDto` DTOs; `RosterMapper` → domain entities.
- All wire fields camelCase (`studentMemberId`, `academicYearLabel`, `enrollmentId`).
- Pagination via `{ raw: true }` + `parseEnvelope()` for list endpoints.

### TR-032 — Transfer pattern update
- Remove `ROSTER_EP.transfer` (the `/core/students/:studentId/transfer` path doesn't
  exist in the core service).
- Update `endpoint/admin-roster.endpoint.ts`: remove `transfer` key; retain `classes`,
  `classStudents`, `unenroll`, and add `searchPool` (if core supports an unassigned-
  student pool) or document that the search pool is mock-only until core adds the endpoint.
- Document: transfer = unenroll from old class + enroll in new class (two sequential
  Server Actions in the UI).
- `ROSTER_STUDENT_ALREADY_ENROLLED (409)` from POST enroll → surface as
  transfer-warning banner (student is in another class; UI shows current class name).

### TR-033 — Search pool
- `GET /core/api/v1/classes/:classId/students` lists enrolled students. There is no
  core endpoint for listing ALL students not yet in a class. The Add-panel search
  feature must either:
  a. Use IAM member list (`GET /iam/api/v1/members/me/tenants` + member filter) and
     cross-reference with enrolled list — deferred to US-E06.4 IAM wiring.
  b. Remain mock-first for the unassigned-pool query until an appropriate core/IAM
     endpoint exists.
  Mark this search as **mock-first** (decision 0014) in the DI factory for this story.

### TR-034 — Error mapping
- `ROSTER_STUDENT_NOT_ENROLLED (404)` on delete → silent success (student already gone).
- `ROSTER_STUDENT_ALREADY_ENROLLED (409)` on enroll → transfer-warning signal.
- `ROSTER_MEMBER_NOT_STUDENT_ROLE (422)` → toast "Thành viên không có vai trò học sinh".
- `CLASS_ARCHIVED (409)` on enroll → toast "Lớp đã bị lưu trữ".
- `ROSTER_ACCESS_FORBIDDEN (403)` → navigate to error page.

### TR-035 — TEACHER role access
- A TEACHER sees only classes they are assigned to (core enforces this).
- The class selector in the roster UI must reflect only the accessible classes
  (empty if teacher has no assignment).

### TR-036 — TDD
- Integration tests: RosterRepository error-code mapping; transfer two-step pattern.
- `bun vitest run` green; `tsc --noEmit` clean; `bun build` green.

## Design Notes

- Commands: enrollStudent, unenrollStudent (transfer = unenroll + enroll pair)
- Queries: listClasses, listStudents, getEnrollment
- API: `/core/api/v1/classes/*`, `/core/api/v1/classes/:id/students/*`
- Domain rules: one student per year (enforced by BE); TEACHER sees only own classes;
  no dedicated transfer endpoint (two-step pattern)
- UI surfaces: `/admin/roster` — class selector, roster table, Add panel, unenroll
  dialog, transfer confirm dialog

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | enroll-student / unenroll-student use-case with transfer-already-enrolled path |
| Integration | Repository error-code mapping; two-step transfer pattern; pagination |
| E2E | — |
| Platform | `tsc --noEmit` clean; `bun build` green |
| Release | Kong smoke: `GET /core/api/v1/classes` → 200 with active year |

## Harness Delta

TEST_MATRIX row to be added as `planned`.

## Evidence

Add after implementation.
