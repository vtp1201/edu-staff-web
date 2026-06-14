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

---

## Implementation Plan

### Summary

Feature: Principal Teachers Management — teacher list table + GVCN/GVBM assignment sheet for the `principal` appRole.
Lane: normal (1 branch `feat/us-e13.5-principal-teachers-management`, merge to `main` when gate green).
Screens touched: `/[locale]/t/[tenant]/(app)/principal/teachers` (new route).
Done when: AC-1 through AC-16 pass; Storybook stories green; `bun build` + `tsc` clean; design-review gate passed.

Key decisions surfaced:

- **CLASS_EP extension** — two new class-scoped endpoints (`classSubjects`, `assignSubjectTeacher`) are added directly to `src/bootstrap/endpoint/class.endpoint.ts` rather than a new file; this keeps the single-responsibility of class-endpoints-in-one-place that already exists there. Flag to `fe-lead` for ADR only if a separate `principal-teachers.endpoint.ts` is preferred.
- **New `principal/domain/` tree** — principal feature today has only a presentation stub. This US creates the first `domain/` and `infrastructure/` sub-trees under `src/features/principal/`. No interference with admin class-management domain — entities from that feature are imported (type-only) rather than duplicated.
- **Reuse `makeClassManagementRepository()`** — GVCN assign + class list come from the existing DI factory. The new `makePrincipalTeachersUseCases()` factory composes that factory rather than re-wiring the same HTTP client.
- **Mock-first: teacher list + subject list** — `GET /core/api/v1/teachers` and `GET /core/api/v1/subjects` are both mock-first per `NEXT_PUBLIC_USE_MOCK`. MockPrincipalTeachersRepository must match the real DTO shape so swapping in real endpoints requires only removing the mock branch.
- **`TeacherAssignmentSheet` placement** — single-screen at `features/principal/presentation/teachers/`; promote to `components/shared/` only when a second screen needs it.

---

### Phase 1 — Domain

Goal: pure TypeScript domain for teacher assignment in the principal context — entities, failure union, repository interface, use-case logic. TDD red phase: tests written first, all failing.

**Files (layer: `features/principal/domain/teachers/`)**

```
src/features/principal/domain/teachers/
  entities/
    principal-teacher.entity.ts        — PrincipalTeacher { teacherId, displayName, primarySubject,
                                           homeroomClass: { classId, className } | null,
                                           subjectAssignments: ClassSubjectAssignment[],
                                           status: 'active' | 'on-leave', hasConflict: boolean }
    class-subject-assignment.entity.ts — ClassSubjectAssignment { classSubjectId, classId, className,
                                           subjectId, subjectName, teacherId: string | null,
                                           hasConflict: boolean }
  failures/
    principal-teachers.failure.ts      — PrincipalTeachersFailure union:
                                           | { type: 'network-error' }
                                           | { type: 'forbidden' }
                                           | { type: 'not-found'; teacherId?: string }
                                           | { type: 'conflict-exists'; classId: string; subjectId?: string }
                                           | { type: 'unknown'; message: string }
  repositories/
    i-principal-teachers.repository.ts — IPrincipalTeachersRepository interface:
                                           listTeachers(params): Promise<Result<PrincipalTeacher[], PrincipalTeachersFailure>>
                                           listClassSubjects(classId): Promise<Result<ClassSubjectAssignment[], PrincipalTeachersFailure>>
                                           assignHomeroomTeacher(classId, teacherUserId): Promise<Result<void, PrincipalTeachersFailure>>
                                           assignSubjectTeacher(classId, subjectId, teacherUserId): Promise<Result<void, PrincipalTeachersFailure>>
  use-cases/
    get-principal-teachers.use-case.ts
    assign-homeroom-teacher.use-case.ts
    assign-subject-teacher.use-case.ts
    result.ts                          — re-export Result<T, E> (or import from shared if already abstracted)
```

**Note on `Result<T,E>`:** check if `src/features/admin/class-management/domain/use-cases/result.ts` already exports a generic `Result` type. If yes, import from there (type-only) rather than re-defining. Do not duplicate the type.

**Test first (Vitest unit — all red before any implementation)**

File: `src/features/principal/domain/teachers/use-cases/get-principal-teachers.use-case.test.ts`
- mock `IPrincipalTeachersRepository` via interface; stub returns `[PrincipalTeacher, ...]`
- asserts use-case returns the teacher list unchanged
- asserts use-case propagates `PrincipalTeachersFailure` on repo error

File: `src/features/principal/domain/teachers/use-cases/assign-homeroom-teacher.use-case.test.ts`
- calls `repository.assignHomeroomTeacher(classId, teacherUserId)`
- asserts `Ok(void)` on success
- asserts `Err({ type: 'conflict-exists' })` when repo returns that failure
- asserts `Err({ type: 'not-found' })` when classId unknown

File: `src/features/principal/domain/teachers/use-cases/assign-subject-teacher.use-case.test.ts`
- mirrors homeroom test shape for subject assignment path

Done when: `bun vitest run` green for all three use-case test files (domain layer only; infra not yet wired).

---

### Phase 2 — Infrastructure

Goal: HTTP repository implementations (real + mock) that satisfy `IPrincipalTeachersRepository`. Green phase — make Phase 1 tests pass via integration tests on the HTTP boundary.

**Files (layer: `features/principal/infrastructure/teachers/`)**

```
src/features/principal/infrastructure/teachers/
  dtos/
    principal-teacher-response.dto.ts  — PrincipalTeacherResponseDto (camelCase, mirrors openapi)
    class-subject-response.dto.ts      — ClassSubjectResponseDto { classSubjectId, classId, subjectId,
                                           subjectName, teacherId, hasConflict, ... }
  mappers/
    principal-teachers.mapper.ts       — toPrincipalTeacher(dto): PrincipalTeacher
                                       — toClassSubjectAssignment(dto): ClassSubjectAssignment
  repositories/
    principal-teachers.repository.ts   — import 'server-only'; implements IPrincipalTeachersRepository
                                         Uses CLASS_EP.classes (list), CLASS_EP.classHomeroomTeacher(id),
                                         new CLASS_EP.classSubjects(id), new CLASS_EP.assignSubjectTeacher(id, subjectId).
                                         Teacher list: GET /core/api/v1/teachers (mock-first stub inside real repo until core live).
    mock-principal-teachers.repository.ts — NEXT_PUBLIC_USE_MOCK path; seed data derived from
                                         design_src PRINCIPAL_TEACHERS + PT_CLASS_LIST fixtures.
```

**Test first (Vitest integration — repository boundary)**

File: `src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.test.ts`
- mock `http` Axios instance at the boundary (MSW or axios-mock-adapter)
- asserts `listTeachers` unwraps envelope → `PrincipalTeacher[]`
- asserts `assignHomeroomTeacher` sends `PUT` to `CLASS_EP.classHomeroomTeacher(classId)` with body `{ teacherId }`
- asserts `assignSubjectTeacher` sends `PUT` to `CLASS_EP.assignSubjectTeacher(classId, subjectId)` with body `{ teacherId }`
- asserts `network-error` failure on 503; `forbidden` on 403; `not-found` on 404; `conflict-exists` on 409

File: `src/features/principal/infrastructure/teachers/mappers/principal-teachers.mapper.test.ts`
- unit: `toPrincipalTeacher(dto)` maps all fields + defaults `hasConflict = false` when absent
- unit: `toClassSubjectAssignment(dto)` maps correctly

Done when: all mapper + repository tests green; `tsc --noEmit` clean.

---

### Phase 3 — Bootstrap (endpoints + DI)

Goal: wire new endpoints into constants; create the DI factory. No tests needed at this layer (wiring-only, covered by infra integration tests above).

**Files**

```
src/bootstrap/endpoint/class.endpoint.ts       — EXTEND (do not create new file):
                                                 + classSubjects: (classId) => `/core/api/v1/classes/${classId}/subjects`
                                                 + assignSubjectTeacher: (classId, subjectId) =>
                                                     `/core/api/v1/classes/${classId}/subjects/${subjectId}/teacher`

src/bootstrap/di/principal-teachers.di.ts      — import 'server-only'
                                                 makePrincipalTeachersUseCases() factory:
                                                   - if USE_MOCK → MockPrincipalTeachersRepository
                                                   - else → PrincipalTeachersRepository(await createServerHttpClient())
                                                   returns { getTeachers, assignHomeroom, assignSubjectTeacher }
                                                   (each a bound use-case instance)

src/bootstrap/di/index.ts                      — add re-export: `export * from './principal-teachers.di'`
src/bootstrap/endpoint/index.ts                — add re-export if not already auto-exported
```

**Acceptance check:** `bun build` produces no `server-only` boundary violations; CLASS_EP type-checks; DI factory imports resolve.

---

### Phase 4 — RSC page + Server Actions

Goal: Next.js routing layer — RSC page fetches initial teacher list (server); server actions handle GVCN + GVBM assignment mutations.

**Files (layer: `app/[locale]/t/[tenant]/(app)/principal/teachers/`)**

```
page.tsx       — RSC; calls makePrincipalTeachersUseCases().getTeachers();
                 passes ViewModel props + action refs to PrincipalTeachersScreen.
                 No DI imported outside this file.
actions.ts     — 'use server'
                 assignHomeroomTeacherAction(classId, teacherUserId): calls factory → use-case → returns
                   { ok: true } | { ok: false; errorKey: PrincipalTeachersFailure['type'] }
                 assignSubjectTeacherAction(classId, subjectId, teacherUserId): same pattern
```

**Test first (Vitest + msw — server action boundary)**

File: `src/app/[locale]/t/[tenant]/(app)/principal/teachers/actions.test.ts`
- stubs `makePrincipalTeachersUseCases` (vi.mock bootstrap/di)
- asserts `assignHomeroomTeacherAction` returns `{ ok: true }` on `Ok(void)`
- asserts returns `{ ok: false, errorKey: 'forbidden' }` on repo forbidden failure
- asserts returns `{ ok: false, errorKey: 'conflict-exists' }` on conflict failure

Done when: action tests green; page.tsx renders without TS errors (tsc clean).

---

### Phase 5 — Presentation

Goal: ViewModel interface, teacher list table, assignment sheet — all `'use client'`. Depends on Phase 1 entities only (no infra imports).

**Files (layer: `features/principal/presentation/teachers/`)**

```
principal-teachers-screen.i-vm.ts     — ViewModel interface:
                                         teachers: PrincipalTeacher[]
                                         classes: { classId: string; className: string }[]
                                         isLoading: boolean
                                         onAssignHomeroom: (classId, teacherUserId) => Promise<void>
                                         onAssignSubjectTeacher: (classId, subjectId, teacherUserId) => Promise<void>

principal-teachers-screen.tsx         — 'use client'
                                         Props: PrincipalTeachersScreenVM + action refs
                                         Renders: page header (teacher count chip, "Thêm giáo viên" placeholder button),
                                                  TeacherListTable

teacher-list-table.tsx                — 'use client'
                                         Columns: avatar initials + name, primary subject,
                                                  GVCN badge (success/15 bg + icon) or "Chưa phân công" italic,
                                                  subject assignment badges (max 3 + "+N" overflow),
                                                  StatusBadge (Đang dạy / Nghỉ phép),
                                                  "Phân công lớp" button (opens sheet), "Chi tiết" placeholder
                                         Uses: StatusBadge from components/shared/status-badge/
                                         On row button click: setSelectedTeacher(teacher) → sheet open

teacher-assignment-sheet.tsx          — 'use client'
                                         Uses: Sheet primitive from components/ui/sheet/
                                         Sections: GVCN picker (Select from classes[]), GVBM rows (class + subject per row)
                                         Row delete, "Thêm hàng" add row
                                         Conflict row: alertTriangle icon + tooltip
                                         Save → calls onAssignHomeroom + onAssignSubjectTeacher per changed row;
                                                loading state on Save button during in-flight
                                         Cancel → onOpenChange(false)
                                         Focus trap: managed by Sheet primitive (Radix)

principal-teachers-screen.stories.tsx — (see Phase 6)
```

**Component placement check (rule: component-organization.md)**
- `StatusBadge` → already at `components/shared/status-badge/` — import, do not copy
- `Sheet` → already at `components/ui/sheet/` — import primitive directly
- `TeacherAssignmentSheet` → single-screen for now; lives in `features/principal/presentation/teachers/`; promote to `components/shared/` when a second screen requires it

**Tokens to use (no raw color)**
- GVCN badge bg: `bg-edu-success/15`, text: `text-edu-success`, border: `border-edu-success/33`
- Subject badge: `bg-primary/15`, `text-primary`, `text-[10px]`
- Status badge: reuse `StatusBadge` component (Đang dạy → `success`, Nghỉ phép → `warning`)
- Conflict row border: `border-l-2 border-destructive`
- Conflict icon: `text-destructive`

**No new tokens needed** — all above map to existing `tokens.css` entries. If any token is missing at implementation time → flag to `fe-lead` for ADR before use.

**Test first (Storybook interaction — written before full component)**
Interaction test in `principal-teachers-screen.stories.tsx`:
- Loading story: table shows skeleton rows; "Phân công lớp" buttons disabled
- Populated story: renders 3 teachers; GVCN badge visible on first teacher; "+2" overflow badge on second
- Empty story: empty state message "Chưa có giáo viên nào"
- AssignmentSheet-Open story: sheet open for a selected teacher; GVCN Select shows current class pre-selected; 2 GVBM rows rendered
- AssignmentSheet-WithConflict story: one GVBM row has `hasConflict: true` → alertTriangle icon visible; error-toned left border on that row

Done when: Storybook renders all 5 stories without console error; interaction assertions (Storybook play functions) pass.

---

### Phase 6 — i18n + Storybook stories + design-review gate

Goal: all UI strings extracted to `messages/{vi,en}.json`; Storybook stories finalized; design-review gate passed.

**Files**

```
src/bootstrap/i18n/messages/vi.json   — add namespace:
  "principalTeachers": {
    "pageTitle": "Quản lý giáo viên",
    "teacherCount": "{count} giáo viên",
    "addTeacherButton": "Thêm giáo viên",
    "assignButton": "Phân công lớp",
    "detailButton": "Chi tiết",
    "noHomeroomClass": "Chưa phân công",
    "statusActive": "Đang dạy",
    "statusOnLeave": "Nghỉ phép",
    "sheetTitle": "Phân công cho {teacherName}",
    "homeroomSection": "Giáo viên chủ nhiệm (GVCN)",
    "homeroomLabel": "Lớp chủ nhiệm",
    "subjectSection": "Giáo viên bộ môn (GVBM)",
    "addRowButton": "Thêm hàng",
    "saveButton": "Lưu phân công",
    "cancelButton": "Hủy",
    "classColumn": "Lớp",
    "subjectColumn": "Môn học",
    "conflictTooltip": "Giáo viên có xung đột lịch",
    "emptyState": "Chưa có giáo viên nào",
    "errors": {
      "network-error": "Lỗi kết nối, vui lòng thử lại",
      "forbidden": "Bạn không có quyền thực hiện thao tác này",
      "not-found": "Không tìm thấy giáo viên",
      "conflict-exists": "Giáo viên đang có xung đột lịch dạy",
      "unknown": "Đã có lỗi xảy ra"
    }
  }

src/bootstrap/i18n/messages/en.json   — mirror exact structure, English values

src/features/principal/presentation/teachers/
  principal-teachers-screen.stories.tsx — finalize all 5 stories with play() interaction tests
```

**i18n boundary reminder:** `assignHomeroomTeacherAction` / `assignSubjectTeacherAction` return `errorKey: PrincipalTeachersFailure['type']`; translation happens in `teacher-assignment-sheet.tsx` via `useTranslations('principalTeachers')` → `t(\`errors.${errorKey}\`)`. No translation in server layer.

**Design-review gate (`docs/DESIGN_REVIEW.md`)**
- Run `/impeccable audit` on `PrincipalTeachersScreen` + `TeacherAssignmentSheet` stories
- Run `/impeccable critique` on the full teachers page flow
- Fix contrast/focus/motion findings; scope: impeccable cannot override token choices or layout from `design-spec.jsonc#principal-teachers`

Done when: `/impeccable audit` findings resolved (or explicitly deferred with justification); `tsc --noEmit` clean; `bun build` passes pre-push hook; TEST_MATRIX row updated to `implemented`.

---

### Component + state sketch

**State classification (no Zustand)**

| State | Type | Location |
|---|---|---|
| Teacher list (initial load) | Server (RSC fetch) | `page.tsx` → props |
| Selected teacher for sheet | Local UI | `useState` in `principal-teachers-screen.tsx` |
| Sheet open/close | Local UI | `useState` in `principal-teachers-screen.tsx` |
| GVBM rows in-flight edit | Local form | `useState` in `teacher-assignment-sheet.tsx` |
| Save loading state | Local UI | `useState` in `teacher-assignment-sheet.tsx` |
| Optimistic GVCN update | Local UI | optimistic `useState` on save, revalidated via `revalidatePath` from action |

No TanStack Query needed — teacher list is small, initial load via RSC; mutations use Server Actions + `revalidatePath`. `fe-state-engineer` not required unless teacher list pagination is added later.

**Component tree (simplified)**

```
page.tsx (RSC)
└── PrincipalTeachersScreen (client)
    ├── page header: title + count chip + "Thêm giáo viên" button
    ├── TeacherListTable (client)
    │   └── per row: avatar, subject badge, GVCNBadge, SubjectAssignmentBadges, StatusBadge, actions
    └── TeacherAssignmentSheet (client — Sheet primitive)
        ├── GVCN section: Select (class list)
        └── GVBM section: rows (class Select + subject Select + delete icon) + "Thêm hàng"
            └── conflict row: alertTriangle icon + tooltip
```

`fe-component-architect` not required — no new shared primitive is created; all reused components are pre-existing (`Sheet`, `StatusBadge`).

---

### Risks, dependencies, open questions

**Risks**

- Teacher list mock fixture must match the DTO shape expected by the real `GET /core/api/v1/teachers` endpoint (currently unconfirmed in openapi). If the shape diverges when core goes live, mapper refactor required. Mitigate: define `PrincipalTeacherResponseDto` conservatively based on `TeacherMember` entity from admin domain; document assumed shape in dto file comment.
- `PUT /core/api/v1/classes/{classId}/subjects/{subjectId}/teacher` returns 409 on conflict — `conflict-exists` failure must be tested at the integration boundary (Phase 2 test).
- Subject picker filters by class-subject availability (AC-9). `GET /core/api/v1/classes/{classId}/subjects` is REAL but returns only `ClassSubject` records, not the full subject catalogue. The picker must cross-reference `SUBJECT_CATALOGUE_EP.subjects` (mock-first) to resolve subject names. Both calls happen server-side (in `listClassSubjects` or a composed use-case); do not expose two separate fetches to the client.
- `Class` entity and `TeacherMember` entity are imported from `features/admin/class-management/`. This creates a cross-feature domain import. Acceptable here (type-only, no side effects), but if admin class-management domain moves, principal domain breaks. `[OPEN QUESTION 1]`

**Open questions**

- `[OPEN QUESTION 1]` Should `Class` and `TeacherMember` entities live in a `shared/` domain (e.g., `features/shared/domain/`) rather than under `admin/`? Currently acceptable to import from admin domain; flag to `fe-lead` when a third feature needs them (promote trigger = 2 consumers outside admin).
- `[OPEN QUESTION 2]` Does `GET /core/api/v1/teachers` in core openapi scope to the requesting tenant? If not, the principal could see teachers from other tenants. Needs BE contract confirmation before the mock-first stub is replaced with real data.
- `[OPEN QUESTION 3]` The design shows `TeacherAssignmentSheet` as either an inline-expanded row or a side sheet. The plan defaults to the `Sheet` primitive (slide-in panel) for focus management (AC-14). If product prefers inline-expanded, the component structure changes (no Sheet primitive, no focus trap) — `[DECISION NEEDED from product before Phase 5]`.
- `[OPEN QUESTION 4]` "Chi tiết" button is out-of-scope (placeholder). If a teacher-detail route is planned in the same epic, that route's slug should be reserved now to avoid conflicts with this branch. Confirm with `fe-lead`.
- `[ADR trigger]` Two new path functions added to `CLASS_EP` (`classSubjects`, `assignSubjectTeacher`). No separate ADR needed unless `fe-lead` prefers a dedicated `principal-teachers.endpoint.ts`. Flag to `fe-lead`.
