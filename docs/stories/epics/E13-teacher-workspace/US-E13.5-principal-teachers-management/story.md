# US-E13.5 Principal Teachers Management — GVCN / GVBM Assignment

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.10 (class management — classes must exist before GVCN can be assigned)
- Depends on: US-E12.3 (subject catalogue — subjects needed for GVBM assignment sheet subject picker)
- Blocks: nothing critical after this; timetable slot editor (US-E12.5) already mock-first
- Feature module(s) chạm: `src/features/principal/presentation/teachers/`, `src/features/principal/domain/`, `src/features/principal/infrastructure/`
- Shared contract/file: `bootstrap/endpoint/core.endpoint.ts` (classes + homeroom-teacher + class-subjects endpoints — NOT `/teaching-assignments`, that path does not exist); `features/admin/subjects/` (SubjectParent/Subject data for the picker)

## Product Contract

### Context (design delta — ADR 0034)

teacher.jsx 1406 adds `PrincipalTeachersScreen` and `TeacherAssignmentSheet`:

**Screen `/principal/teachers`** (route already in screens.md):
- Teacher list table: name/avatar, primary subject, GVCN class (if assigned), subject assignments (badges), status (Đang dạy / Nghỉ phép).
- "Phân công lớp" button per row → opens `TeacherAssignmentSheet` panel.
- "Chi tiết" button per row → teacher detail (out-of-scope here; placeholder).
- "Thêm giáo viên" header button → out-of-scope (separate US).

**`TeacherAssignmentSheet` (slide-in panel or inline expanded section):**
- GVCN picker: radio/select from class list — assigns homeroom teacher.
- Subject assignment rows: each row = class picker + subject picker (grouped by SubjectParent + grade-scoped).
- Subject availability filter: greys out subjects that have no ClassSubject record for the selected class (`PT_CLASS_SUBJECT_MAP` logic — API-enforced in production).
- Add row / delete row buttons.
- Conflict detection alert: if teacher already has a timetable conflict (visual flag — conflict is API-enforced; UI reflects the flag, does not compute it).
- Save → GVCN: `PUT /core/api/v1/classes/{classId}/homeroom-teacher`; GVBM per row: `PUT /core/api/v1/classes/{classId}/subjects/{subjectId}/teacher`. Note: `/teaching-assignments` path does NOT exist in core openapi — do not use it.
- Cancel → dismiss without save.

### BE readiness

Verified against `services/core/docs/openapi.yaml` @ origin/main (2026-06-14). The path `/teaching-assignments` referenced in the design source comment (`teacher.jsx`) does NOT exist in core openapi. The real endpoints are:

| Data | Endpoint | Readiness |
| --- | --- | --- |
| Teacher list (principal scope) | `GET /core/api/v1/teachers` (via US-E06.8 staffing wiring) | **mock-first** (core staffing domain wired but teacher-list endpoint not confirmed in openapi; reuse US-E06.8 infrastructure if compatible) |
| Class list | `GET /core/api/v1/classes` | **REAL** (core live) |
| Homeroom teacher read | `GET /core/api/v1/classes/{classId}/homeroom-teacher` | **REAL** (confirmed in core openapi) |
| Homeroom teacher assign | `PUT /core/api/v1/classes/{classId}/homeroom-teacher` | **REAL** (confirmed in core openapi) — body: `{ teacherId }` |
| Class-subjects list (for subject picker) | `GET /core/api/v1/classes/{classId}/subjects` | **REAL** (confirmed) |
| Class-subject detail | `GET /core/api/v1/class-subjects/{classSubjectId}` | **REAL** (confirmed) |
| Subject teacher assign (GVBM) | `PUT /core/api/v1/classes/{classId}/subjects/{subjectId}/teacher` | **REAL** (confirmed) — body: `{ teacherId }` |
| Position assignments (staffing) | `GET /core/api/v1/position-assignments` | **REAL** (wired by US-E06.8) |
| Subject list (for picker) | `GET /core/api/v1/subjects` | **mock-first** (core subject catalogue not yet live) |

**Path correction:** The design source comment references `/teaching-assignments` — this path does NOT exist in core openapi and should not be used. The correct read/write surface for GVCN and GVBM assignment is:
- GVCN: `GET/PUT /core/api/v1/classes/{classId}/homeroom-teacher`
- GVBM: `GET /core/api/v1/classes/{classId}/subjects` + `PUT /core/api/v1/classes/{classId}/subjects/{subjectId}/teacher`

**Summary:** Read operations for GVCN + GVBM use REAL endpoints. Subject picker is mock-first (subject catalogue not live). Teacher list is mock-first (pending confirmation of teacher list scope in staffing domain). Decision `0014` applies for all mock-first data. FE repository must NOT reference `/teaching-assignments`.

## Relevant Product Docs

- `design_src/edu/teacher.jsx` — `PrincipalTeachersScreen` (lines 601–773), `TeacherAssignmentSheet` (lines 777–1102), `PRINCIPAL_TEACHERS`, `PT_CLASS_LIST`, `PT_CLASS_SUBJECT_MAP`
- `design_src/edu/subjects-data.jsx` — `SM_SEED_PARENTS` seed (subject catalogue for picker)
- `docs/product/screens.md` — "Teachers / Classes" row (Principal section)
- `docs/product/design-spec.jsonc` — regenerate `#principal-teachers` section (ADR 0034)
- `.claude/rules/api-integration.md` — core service contract (note: `/teaching-assignments` path is invalid; use homeroom-teacher + class-subjects endpoints per BE readiness table above)
- US-E12.5 (timetable) — conflict detection is computed in timetable domain; this screen only reads the conflict flag from API

## RBAC

- ADMIN / MANAGER (appRole=principal) can view teacher list and save assignments.
- TEACHER role has no access to this screen (admin route guard inherited).

## Acceptance Criteria

### Teacher list
- AC-1: Table renders teachers with: name + avatar initials, primary subject, GVCN badge (class name styled success/15 bg) or "Chưa phân công" italic, subject assignment badges (max 3 + overflow "+N"), status badge (Đang dạy success / Nghỉ phép warning).
- AC-2: "Phân công lớp" button per row — opens assignment sheet for that teacher.
- AC-3: Header shows teacher count chip + "Thêm giáo viên" button (placeholder toast acceptable for now).
- AC-4: Loading skeleton while fetching; error state with retry.
- AC-5: Empty state if no teachers in tenant.

### Assignment Sheet
- AC-6: Sheet opens with current GVCN class pre-selected and existing assignments pre-populated.
- AC-7: GVCN picker: dropdown of all classes in tenant; selecting a class assigns homeroom.
- AC-8: Subject assignment rows: each row has class picker + subject picker. Subject picker groups by SubjectParent; shows only ACTIVE subjects.
- AC-9: Subject picker filters to subjects compatible with the selected class (classSubject availability — greys out / disables unavailable subjects).
- AC-10: "Thêm hàng" adds an empty row; delete icon removes a row.
- AC-11: Save calls write API (mock-first); optimistic update shown in table after save; loading state on button.
- AC-12: Cancel dismisses without change.
- AC-13: If timetable conflict flag present on any row → show `alertTriangle` icon + tooltip text (visual only — conflict is API-computed, not recalculated here).

### Common
- AC-14: WCAG 2.1 AA — table keyboard-navigable; sheet focus-managed (focus trap in sheet, return focus to trigger on close).
- AC-15: All strings in `messages/{vi,en}.json` namespace `principalTeachers`.
- AC-16: Tokens-only styling.

## Design Notes

### Teacher list table column widths
Giáo viên / Môn chính / GVCN / Phân công bộ môn / Trạng thái / Actions. GVCN cell: `display: inline-flex`, `bg: success + '15'`, `color: success`, `border: success + '33'`, icon users. Subject assignment badges: `fontSize: 10`, primary color.

### Assignment Sheet layout
Rendered inline below the row or as a side sheet (FE decision). Contains:
- GVCN section: label + class select.
- GVBM section: table of rows (class | subject | delete). "Thêm hàng" button at bottom.
- Save/Cancel footer buttons.

### Conflict indicator
On a row: `Icon name="alertTriangle"` in error color + tooltip. Drives the same visual as timetable conflict — error toned left border.

### design-spec.jsonc
BA to regenerate `design-spec.jsonc#principal-teachers` from teacher.jsx 1406 `PrincipalTeachersScreen` + `TeacherAssignmentSheet` before FE implements.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | GetTeachersUseCase (principal scope); AssignHomeroomTeacherUseCase (PUT homeroom-teacher — validate GVCN uniqueness per class); AssignSubjectTeacherUseCase (PUT class-subject teacher — validate availability filter); mapAssignmentConflictFlag |
| Integration | HomeroomTeacherRepository (REAL: GET/PUT `/classes/{classId}/homeroom-teacher`); ClassSubjectRepository (REAL: GET `/classes/{classId}/subjects`, GET `/class-subjects/{id}`, PUT `/classes/{classId}/subjects/{subjectId}/teacher`); TeacherListRepository (mock-first); SubjectRepository (mock-first for picker) |
| E2E | Storybook: TeacherList-Loading / TeacherList-Populated / AssignmentSheet-Open / AssignmentSheet-WithConflict / AssignmentSheet-Save-Loading |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: add US-E13.5 row (planned).
- `docs/product/screens.md`: "Teachers / Classes" row (Principal) → `🎨 design-ready`.
- `docs/product/design-spec.jsonc`: add `#principal-teachers` + `#teacher-assignment-sheet` sections.
