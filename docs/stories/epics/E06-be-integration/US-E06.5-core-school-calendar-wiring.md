# US-E06.5 core — Wire School Setup & Academic Calendar to Real BE

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E06.3 (base URL + endpoint paths)
- Blocks: US-E06.6 (subject catalogue needs grade-level range confirmed), US-E06.7
- Feature module(s) chạm: `src/features/admin/school-setup/`,
  `src/features/admin/calendar/` (new)
- Shared contract/file: `bootstrap/endpoint/admin-school-setup.endpoint.ts`,
  `bootstrap/endpoint/calendar.endpoint.ts`,
  `bootstrap/di/admin-school-setup.di.ts`, `bootstrap/di/calendar.di.ts` (new)

## Product Contract

Replace mock-first repositories for school config and academic calendar with real
HTTP calls to the `core` service through Kong (`/core/api/v1/...`).

**School config** (US-E12.1 already implemented as mock-first):
- `GET /core/api/v1/config/school` — read grade-level range + operational settings + setupStatus
- `GET /core/api/v1/config/school/setup-status` — onboarding checklist
- `PUT /core/api/v1/config/school/grade-levels` — set grade range
- `PUT /core/api/v1/config/school/operational-settings` — set grade publish mode
- `POST /core/api/v1/schools` — create the school (first-time setup)
- `GET /core/api/v1/schools/current` — read current school (name, address, academicYear)

**Academic calendar** (US-E12.2 already implemented as mock-first):
- `POST /core/api/v1/academic-years` — create academic year
- `GET /core/api/v1/academic-years` — list years (cursor-paginated)
- `GET /core/api/v1/academic-years/active` — current active year
- `GET /core/api/v1/academic-years/:yearId` — get one year
- `POST /core/api/v1/academic-years/:yearId/activate` — activate year
- `POST /core/api/v1/academic-years/:yearId/archive` — archive year
- `POST /core/api/v1/academic-years/:yearId/terms` — create term
- `GET /core/api/v1/academic-years/:yearId/terms` — list terms (ordered by startDate)
- `GET /core/api/v1/academic-years/:yearId/terms/:termId` — get one term
- `PATCH /core/api/v1/academic-years/:yearId/terms/:termId` — update term name/dates
- `POST /core/api/v1/academic-years/:yearId/terms/:termId/archive` — archive term

Auth: Bearer token (tenant-scoped), enforced by Kong `edu-edge-auth`. Caller
must be tenant ADMIN or SUPER_ADMIN for mutating operations; any authenticated
member can read.

## Relevant Product Docs

- `edu-api/services/core/docs/INTEGRATION.md` — school + calendar endpoints
- `edu-api/services/core/docs/openapi.yaml` — authoritative contract
- `edu-api/services/core/docs/ERROR_CODES.md` — error codes
- `docs/stories/epics/E12-admin-core/US-E12.1-school-setup.md` — existing mock-first impl
- `docs/stories/epics/E12-admin-core/US-E12.2-academic-calendar.md` — planned mock-first
- `docs/decisions/0030-kong-gateway-base-url.md`

## Kong Routes

All core business paths routed via `/core/api/v1` → `edu-edge-auth` plugin (Bearer required).
`/core/health` → health (no auth, raw).

## Acceptance Criteria

### TR-019 — Real SchoolConfigRepository
- `features/admin/school-setup/infrastructure/repositories/school-config.repository.ts`
  (server-only): lift mock, implement real HTTP calls.
- Error mapping: `SCHOOL_NOT_FOUND (404)`, `SCHOOL_ALREADY_EXISTS (409)`,
  `SCHOOL_FORBIDDEN (403)`, `SCHOOL_GRADE_LEVEL_RANGE_INVALID (400)`,
  `SCHOOL_GRADE_LEVEL_RANGE_NARROWING_BLOCKED (409)`.
- DI factory `USE_MOCK ? MockSchoolConfigRepository : SchoolConfigRepository`.

### TR-020 — Real CalendarRepository (new feature: admin/calendar)
- `features/admin/calendar/infrastructure/repositories/calendar.repository.ts`
  (server-only).
- `CalendarYearDto`, `CalendarTermDto` DTOs; `CalendarMapper` maps → entities.
- Methods: `createYear`, `listYears` (cursor-paginated, reads `meta.pagination`
  with `{ raw: true }` Axios config), `getActiveYear`, `getYear`, `activateYear`,
  `archiveYear`, `createTerm`, `listTerms`, `getTerm`, `updateTerm`, `archiveTerm`.
- Error mapping: `CALENDAR_YEAR_NOT_FOUND (404)`, `CALENDAR_YEAR_LABEL_EXISTS (409)`,
  `CALENDAR_ACTIVE_YEAR_EXISTS (409)`, `CALENDAR_YEAR_ARCHIVED (409)`,
  `CALENDAR_INVALID_DATE_RANGE (400)`, `CALENDAR_TERM_OVERLAP (409)`,
  `CALENDAR_TERM_NOT_FOUND (404)`, `CALENDAR_TERM_IN_USE (409)`,
  `CALENDAR_FORBIDDEN (403)`.

### TR-021 — DI factory for calendar
- `bootstrap/di/calendar.di.ts` (server-only): `makeCalendarUseCase()` factory.
- `USE_MOCK ? MockCalendarRepository : CalendarRepository` (decision 0014).

### TR-022 — Pagination contract
- List endpoints use cursor-based pagination (`nextCursor`, `hasMore`).
- Repository calls with `{ raw: true }` + `parseEnvelope()` to read `meta.pagination`.
- ViewModels include `hasMore: boolean` and `nextCursor: string | null`.

### TR-023 — Error states in UI
- Grade-level narrowing warning: `SCHOOL_GRADE_LEVEL_RANGE_NARROWING_BLOCKED` → callout
  "Không thể thu hẹp — có lớp đang hoạt động trong vùng này".
- Year conflict: `CALENDAR_ACTIVE_YEAR_EXISTS` → toast error "Đã có năm học đang hoạt động".
- Term overlap: `CALENDAR_TERM_OVERLAP` → field error on date inputs.

### TR-024 — TDD
- Unit tests: CalendarUseCase (create year, validate date order/overlap, archive blocked).
- Integration tests: CalendarRepository HTTP error-code mapping (mock HTTP).
- `bun vitest run` green; `tsc --noEmit` clean; `bun build` green.

### TR-025 — US-E12.2 screen implementation
- US-E12.2 (`planned`) must be implemented as part of or prior to this story
  (calendar screen needs to exist before the real repo can be exercised).
  Coordinate with FE team: if US-E12.2 not yet built, this story scopes real-repo
  wiring only and marks it mock-first until the screen exists.

## Design Notes

- Commands: createYear, activateYear, archiveYear, createTerm, updateTerm, archiveTerm,
  createSchool, setGradeRange, setOperationalSettings
- Queries: getSchoolConfig, getSetupStatus, listYears, getActiveYear, listTerms
- API: `/core/api/v1/schools/*`, `/core/api/v1/config/school/*`,
  `/core/api/v1/academic-years/*`
- Domain rules: one active year at a time; no term date overlap; archive blocked
  when term has records; narrowing grade range blocked when active classes exist

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | CalendarUseCase tests (date validation, overlap detection, archive guard) |
| Integration | Repository HTTP error-code mapping; envelope unwrap; pagination read |
| E2E | — |
| Platform | `tsc --noEmit` clean; `bun build` green |
| Release | Kong smoke: `GET /core/api/v1/config/school` → 200 with tenant token |

## Harness Delta

TEST_MATRIX row to be added as `planned`.

## Evidence

Add after implementation.
