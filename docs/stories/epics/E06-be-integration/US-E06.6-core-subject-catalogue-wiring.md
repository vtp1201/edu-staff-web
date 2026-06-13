# US-E06.6 core — Wire Subject Catalogue (SubjectParents + Subjects) to Real BE

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E06.3 (base URL), US-E06.5 (grade-level range must be confirmed
  in core before subjects can be created)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/subjects/`
- Shared contract/file: `bootstrap/endpoint/subject-catalogue.endpoint.ts`,
  `bootstrap/di/subject-catalogue.di.ts`

## Product Contract

Replace mock-first `SubjectCatalogueRepository` with real HTTP calls to the `core`
service (US-E12.3 already implemented as mock-first). This lifts the mock for:

**SubjectParent (bộ môn / tổ chuyên môn):**
- `POST /core/api/v1/subject-parents` — create
- `GET /core/api/v1/subject-parents` — list (cursor-paginated, optional `?status=ACTIVE|ARCHIVED`)
- `GET /core/api/v1/subject-parents/:id` — get one
- `PATCH /core/api/v1/subject-parents/:id` — update `conceptLabelCustom` (name immutable)
- `POST /core/api/v1/subject-parents/:id/archive` — archive (blocked if active subjects)

**Subjects (môn học — grade-scoped):**
- `POST /core/api/v1/subjects` — create (requires active SubjectParent + grade in range)
- `GET /core/api/v1/subjects` — list (cursor-paginated)
- `GET /core/api/v1/subjects/:id` — get one
- `PATCH /core/api/v1/subjects/:id` — update name/code/master fields
- `POST /core/api/v1/subjects/:id/archive` — archive (blocked if active GVBM assignment)

**ClassSubject (US-057 — assign Subject to Class):**
- `POST /core/api/v1/classes/:classId/subjects` — assign
- `GET /core/api/v1/classes/:classId/subjects` — list ClassSubjects for a class
- `GET /core/api/v1/class-subjects/:csId` — get detail (locked + editable fields assembled)
- `PATCH /core/api/v1/class-subjects/:csId` — update customizable fields
- `POST /core/api/v1/class-subjects/:csId/archive` — archive
- `PUT /core/api/v1/classes/:classId/subjects/:subjectId/teacher` — set GVBM
- `DELETE /core/api/v1/classes/:classId/subjects/:subjectId/teacher` — remove GVBM

## Relevant Product Docs

- `edu-api/services/core/docs/INTEGRATION.md` — SubjectParent, Subject, ClassSubject sections
- `edu-api/services/core/docs/openapi.yaml` — authoritative contract
- `docs/stories/epics/E12-admin-core/US-E12.3-subject-catalogue.md` — mock-first impl
- `docs/decisions/0030-kong-gateway-base-url.md`

## Acceptance Criteria

### TR-026 — Real SubjectCatalogueRepository
- Lift mock in `features/admin/subjects/infrastructure/repositories/subject-catalogue.repository.ts`.
- `SubjectParentDto`, `SubjectDto`, `ClassSubjectDto` DTOs; mapper → entities.
- Error mapping: `SUBJECT_PARENT_NOT_FOUND (404)`, `SUBJECT_PARENT_ALREADY_EXISTS (409)`,
  `SUBJECT_PARENT_IN_USE (409)`, `SUBJECT_PARENT_ARCHIVED (409)`,
  `SUBJECT_PARENT_FORBIDDEN (403)`, `SUBJECT_ALREADY_EXISTS (409)`,
  `SUBJECT_IN_USE (409)`, `SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE (422)`,
  `SUBJECT_PARENT_NOT_ACTIVE (422)`, `CLASS_SUBJECT_ALREADY_EXISTS (409)`,
  `CLASS_SUBJECT_LOCKED_FIELD_UPDATE (400)`, `CLASS_SUBJECT_IN_USE (409)`.
- Pagination via `{ raw: true }` + `parseEnvelope()` for list endpoints.

### TR-027 — DI factory update
- `bootstrap/di/subject-catalogue.di.ts`: `USE_MOCK ? Mock : Real` (decision 0014).

### TR-028 — Locked fields contract
- ClassSubject GET response includes both `lockedFields` (inherited from Subject
  master, read-only) and editable fields (`classAdaptedNotes`, `classExerciseRefs`,
  `classScheduleNotes`).
- PATCH must not include locked field names — UI must send only editable fields.
- ViewModel separates locked vs editable for display.

### TR-029 — Error states in UI
- Archive SubjectParent blocked: `SUBJECT_PARENT_IN_USE` → toast "Bộ môn đang có
  môn học hoạt động, không thể lưu trữ".
- Archive Subject blocked: `SUBJECT_IN_USE` → toast "Môn học đang có GVBM, không
  thể lưu trữ".
- Grade level outside range: `SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE` → field
  error on grade selector.

### TR-030 — TDD
- Integration tests: repository error-code mapping (mock HTTP).
- `bun vitest run` green; `tsc --noEmit` clean; `bun build` green.

## Design Notes

- Commands: createParent, archiveParent, updateParent, createSubject, archiveSubject,
  updateSubject, assignSubjectToClass, archiveClassSubject, updateClassSubject,
  setGVBM, removeGVBM
- Queries: listParents, getParent, listSubjects, getSubject, listClassSubjects,
  getClassSubject
- API: `/core/api/v1/subject-parents/*`, `/core/api/v1/subjects/*`,
  `/core/api/v1/class-subjects/*`, `/core/api/v1/classes/:id/subjects/*`
- Domain rules: name immutable on SubjectParent; archive blocked when in-use;
  gradeLevel must be within tenant range; one subject per (tenant, parent, grade)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Archive-guard use-case test; locked-field separation |
| Integration | Repository HTTP error-code mapping; locked-fields assembly |
| E2E | — |
| Platform | `tsc --noEmit` clean; `bun build` green |
| Release | Kong smoke: `GET /core/api/v1/subject-parents` → 200 |

## Harness Delta

TEST_MATRIX row to be added as `planned`.

## Evidence

- Unit + integration: 12 new tests in `subject-catalogue.repository.test.ts`
  covering error-code mapping (SUBJECT_PARENT_IN_USE, SUBJECT_IN_USE,
  SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE, SUBJECT_PARENT_NOT_ACTIVE,
  SUBJECT_PARENT_ALREADY_EXISTS, SUBJECT_ALREADY_EXISTS, SUBJECT_PARENT_NOT_FOUND,
  SUBJECT_PARENT_FORBIDDEN, CLASS_SUBJECT_LOCKED_FIELD_UPDATE, NETWORK_ERROR) +
  paginated list via envelope.
- 245/245 total Vitest pass (45 files); `tsc --noEmit` clean; `bun run build` green.
- SubjectCatalogueFailure union expanded with 10 new variants (TR-026).
- i18n: 10 new error keys added to vi.json + en.json (TR-029).
- listParents + listSubjects use `{ raw: true }` + `parseEnvelope()` (TR-026).
- DI factory: already had USE_MOCK toggle (TR-027); verified in place.
