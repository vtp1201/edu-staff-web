# US-E06.8 core — Wire Staffing (Departments, Position Titles, Position Assignments) to Real BE

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E06.3 (base URL), US-E06.5 (academic year context for position
  assignments), US-E06.6 (SubjectParent IDs needed for department scoping)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/staffing/` (new feature)
- Shared contract/file: (no existing endpoint file — new `staffing.endpoint.ts` needed)

## Product Contract

Wire the staffing domain (Departments, Position Titles, Position Assignments) from the
`core` service. This is a **new feature area** — no existing mock-first implementation
on the frontend. The feature must be built mock-first first (domain + mock repo),
then the real repository wired in the same story (or split: one story to scaffold
domain + screen, one to wire real BE).

**Departments (Khoa/Tổ):**
- `POST /core/api/v1/departments` — create
- `GET /core/api/v1/departments` — list (cursor-paginated, `?status=ACTIVE|ARCHIVED`)
- `GET /core/api/v1/departments/:id` — get one
- `PATCH /core/api/v1/departments/:id` — update name/conceptLabel/subjectParentIds
- `POST /core/api/v1/departments/:id/archive` — archive (blocked if active assignments)

**Position Titles (Chức danh):**
- `POST /core/api/v1/position-titles` — create (name, scopeType, permissions)
- `GET /core/api/v1/position-titles` — list (cursor-paginated, `?scopeType=&status=`)
- `GET /core/api/v1/position-titles/:id` — get one
- `PATCH /core/api/v1/position-titles/:id` — update permissions
- `POST /core/api/v1/position-titles/:id/archive` — archive (blocked if active assignments)

**Position Assignments (Phân công chức danh):**
- `POST /core/api/v1/position-assignments` — assign a position to a teacher
- `GET /core/api/v1/position-assignments` — list (ADMIN: any filter; non-ADMIN: own only)
- `GET /core/api/v1/position-assignments/:id` — get one
- `POST /core/api/v1/position-assignments/:id/revoke` — revoke
- `POST /core/api/v1/position-assignments/copy` — copy year-to-year

**scopeType values:** `SUBJECT_PARENT` (tổ chuyên môn), `DEPARTMENT` (khoa).
`MANAGE_SUBJECT_CONTENT` permission is only valid for `SUBJECT_PARENT` scope.

## Relevant Product Docs

- `edu-api/services/core/docs/INTEGRATION.md` — Staffing section (US-058)
- `edu-api/services/core/docs/openapi.yaml` — authoritative contract
- `docs/product/screens.md` — no staffing screen yet (new area, needs design)
- `docs/decisions/0030-kong-gateway-base-url.md`

## Screen Design Note

There is no existing design spec for the staffing screens. Before the FE team can
build the UI, a design spec entry must be added to `docs/product/design-spec.jsonc`
and a screen entry to `docs/product/screens.md`. This story covers **BE wiring
analysis and domain layer only**; the FE screen design is a prerequisite parallel
track (flag as design-needed).

## Acceptance Criteria

### TR-037 — New endpoint file
- `bootstrap/endpoint/staffing.endpoint.ts`:
  - `DEPARTMENT_EP`, `POSITION_TITLE_EP`, `POSITION_ASSIGNMENT_EP` constants.
  - All paths: `/core/api/v1/departments/*`, `/core/api/v1/position-titles/*`,
    `/core/api/v1/position-assignments/*`.

### TR-038 — DTOs + mapper
- `DepartmentDto`, `PositionTitleDto`, `PositionAssignmentDto` in
  `features/admin/staffing/infrastructure/dtos/`.
- All wire fields camelCase. Mapper → domain entities.
- `CopyAssignmentsResultDto`: `{ sourceAcademicYearId, targetAcademicYearId, copiedCount, skippedCount }`.

### TR-039 — Repository
- `StaffingRepository` (server-only) implements `i-staffing.repository.ts`.
- Pagination via `{ raw: true }` + `parseEnvelope()` for list endpoints.
- Error mapping:
  - `DEPARTMENT_NAME_ALREADY_EXISTS (409)`, `DEPARTMENT_NOT_FOUND (404)`,
    `DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS (409)`
  - `POSITION_TITLE_NAME_ALREADY_EXISTS (409)`, `POSITION_TITLE_HAS_ACTIVE_ASSIGNMENTS (409)`,
    `POSITION_TITLE_INVALID_PERMISSIONS (422)`
  - `POSITION_ASSIGNMENT_ALREADY_EXISTS (409)`, `MEMBER_NOT_TEACHER (422)`,
    `ACADEMIC_YEAR_NOT_ACTIVE (422)`, `SCOPE_ENTITY_NOT_FOUND (404)`,
    `POSITION_FORBIDDEN (403)`

### TR-040 — DI factory
- `bootstrap/di/staffing.di.ts` (server-only): `USE_MOCK ? MockStaffingRepository : StaffingRepository`.
- Mock-first until the staffing screen is built.

### TR-041 — Permissions list (scopeType constraint)
- `MANAGE_SUBJECT_CONTENT` may only appear in permission list when `scopeType === SUBJECT_PARENT`.
- Client-side validation: remove this option from UI when `scopeType === DEPARTMENT`.
- BE returns `422 POSITION_TITLE_INVALID_PERMISSIONS` as safety net.

### TR-042 — Copy assignments (year-to-year)
- `POST /core/api/v1/position-assignments/copy` → `{ sourceAcademicYearId, targetAcademicYearId }`.
- Response: `{ copiedCount, skippedCount }` — skipped = already existed in target year (LWT idempotent).
- UI: dry-run confirmation dialog showing estimated copy scope before submitting.

### TR-043 — TDD
- Unit tests: domain use-cases (permission constraint, archive guard, year-active check).
- Integration tests: repository error-code mapping; copy result DTO.
- `bun vitest run` green; `tsc --noEmit` clean; `bun build` green.

### TR-044 — Design needed flag
- Add staffing screens to `docs/product/screens.md` as `⬜ planned`.
- Flag in this story that FE screen cannot be built until design spec is available.

## Design Notes

- Commands: createDepartment, archiveDepartment, updateDepartment, createPositionTitle,
  archivePositionTitle, updatePositionTitle, assignPosition, revokeAssignment, copyAssignments
- Queries: listDepartments, getDepartment, listPositionTitles, getPositionTitle,
  listPositionAssignments, getPositionAssignment
- API: `/core/api/v1/departments/*`, `/core/api/v1/position-titles/*`,
  `/core/api/v1/position-assignments/*`
- Domain rules: MANAGE_SUBJECT_CONTENT permission only for SUBJECT_PARENT scope;
  archive blocked when active assignments exist; position assignment only for
  TEACHER role members; academicYearId must be ACTIVE year

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Permission constraint, archive-guard, year-active check use-cases |
| Integration | Repository error-code mapping; copy result DTO parsing |
| E2E | — |
| Platform | `tsc --noEmit` clean; `bun build` green |
| Release | Kong smoke: `GET /core/api/v1/departments` → 200 |

## Harness Delta

TEST_MATRIX row to be added as `planned`.
Screen entries to be added to `docs/product/screens.md` as `planned`.

## Evidence

Add after implementation.
