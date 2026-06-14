# US-E13.1 Teacher Class View — My Classes, Students, Schedule

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.10 (class management — classes must exist), US-E12.4 (student roster — students enrolled)
- Blocks: US-E13.2 (attendance wiring — needs class context), US-E13.3 (class log — needs class context)
- Feature module(s) chạm: `src/features/teacher/` (hiện có mock-first UI), `src/features/teacher/presentation/`
- Shared contract/file: `bootstrap/endpoint/class.endpoint.ts` (dùng chung với E12.10)

## Product Contract

Giáo viên xem danh sách lớp được phân công trong năm học hiện tại: lớp chủ nhiệm
(GVCN) và các lớp dạy (GVBM). Từ đây navigate vào xem danh sách học sinh, thời
khóa biểu, và điểm danh.

**Màn hình `/teacher/classes`:**
- Danh sách lớp của GV (GET `/core/api/v1/classes` — TEACHER scope auto-filters
  to assigned classes). Mỗi card lớp: tên lớp, khối, số học sinh, badge GVCN
  (nếu là lớp chủ nhiệm), actions: Xem học sinh / Điểm danh / Sổ đầu bài.

**Màn hình `/teacher/classes/[classId]/students`:**
- Roster học sinh của lớp (GET `/core/api/v1/classes/:classId/students`).
  Bảng: tên HS, mã HS, trạng thái enrollment. Read-only (GV không enroll/unenroll).

**Dashboard integration:**
- Teacher dashboard (`/teacher`) hiện là mock-first (US implemented). Wire
  stat "Lớp học" từ real `/core/api/v1/classes` count.

RBAC: TEACHER thấy classes được assign hoặc homeroom. PRINCIPAL / ADMIN thấy all.

## Relevant Product Docs

- `docs/product/screens.md` — "Classes / Students" row (Teacher section)
- `design_src/edu/teacher.jsx` — `TeacherClasses`, `TeacherStudents` components (pixel reference)
- BE API (REAL — core service, đã live):
  - `GET /core/api/v1/classes` — list (TEACHER scope: only assigned)
  - `GET /core/api/v1/classes/:classId` — get one
  - `GET /core/api/v1/classes/:classId/students` — student roster (read-only for teacher)
  - `GET /core/api/v1/classes/:classId/homeroom-teacher` — check if this teacher is GVCN

## Acceptance Criteria

- AC-1: Teacher thấy danh sách classes mình được assign (GVBM hoặc GVCN), cursor-paginated.
- AC-2: Lớp chủ nhiệm được đánh dấu badge "GVCN".
- AC-3: Click "Xem học sinh" → navigate `/teacher/classes/[classId]/students` → bảng học sinh của lớp đó.
- AC-4: Teacher dashboard stat "Lớp học" hiển thị count thật từ BE (thay mock).
- AC-5: Empty state khi GV chưa được assign lớp nào: "Bạn chưa được phân công lớp nào."
- AC-6: Loading skeleton, error/retry state.
- AC-7: WCAG 2.1 AA.
- AC-8: Tất cả strings qua i18n namespace `teacherClasses`.

## Design Notes

- `TeacherClasses` component: adapt từ `teacher.jsx` — card grid layout, class badge, action buttons.
- `TeacherStudents` component: read-only table, tương tự admin roster (US-E12.4) nhưng không có enroll/unenroll actions.
- Reuse `RosterTable` pattern từ `features/admin/roster/` nếu có (promote to shared nếu cần).
- Commands: none (read-only screen for teacher).
- Queries: `listMyClasses`, `getClassStudents`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-cases: listMyClasses (role filter), getClassStudents |
| Integration | ClassRepository (list with TEACHER scope, get students) |
| E2E | Storybook: Loading/Empty/WithClasses/WithStudents/HomeroomBadge |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: thêm hàng US-E13.1.
- `docs/product/screens.md`: update "Classes / Students" → `🎨 design-ready`.

---

## Plan

### Summary

Two new screens wired to real `core` service. Feature module: `src/features/teacher/`. New domain objects are placed in a **separate `teacher-class` sub-domain** inside the teacher feature (new repository interface + use-cases; existing dashboard repo untouched). Dashboard stat "Lớp học" (`totalClasses`) requires extending `TeacherDashboardStats` + wiring a new `getTotalClasses()` repo method.

**Key decisions resolved by reading the code:**

1. **`isHomeroom` source**: `ClassResponseDto` (admin feature) carries `homeroomTeacherId` directly on the list item. However, `TeacherClassResponseDto` (teacher feature) does NOT — it mirrors the TEACHER-scoped `GET /core/api/v1/classes` response which currently omits `homeroomTeacherId`. Two options: (a) call `GET /classes/{classId}/homeroom-teacher` per class in parallel, compare `teacherUserId` from JWT `sub` claim → `isHomeroom`; (b) update `TeacherClassResponseDto` to add `homeroomTeacherId` if the BE response includes it. **Decision: update DTO to include `homeroomTeacherId` (nullable); derive `isHomeroom` in mapper by comparing with `currentUserId` passed from DI factory. If the field is absent from the wire response, fall back to `false` (not a hard error). Flag this as an open question for BE contract confirmation.** → [ADR flag below]

2. **Student names in teacher roster**: admin `RosterResponseDto` has `{ id, name, dob, gender, status }` — richer than the teacher's current `ClassRosterItemDto { enrollmentId, classId, studentMemberId, academicYearLabel, enrolledAt }` (no name). The teacher class students endpoint and admin class students endpoint hit the same path pattern. The admin repo already gets names. **Decision: update `ClassRosterItemDto` to match the admin `RosterResponseDto` shape; reuse `RosterStudent` entity and `toRosterStudent` mapper (promote mapper to `shared/mappers` or import cross-feature via entity type — entity is safe to cross). Mock-first if the TEACHER-scoped endpoint returns only enrollment data without student name.**

3. **Separate repository**: create `ITeacherClassRepository` + `TeacherClassRepository` (clean). Dashboard repo keeps `getTotalStudents()`. New class repo: `listMyClasses()` + `getClassStudents()`. Dashboard repo can delegate `getTotalClasses()` to call `listMyClasses()` count from the class repo OR add a thin `getTotalClasses()` to the class repo and call from DI.

4. **`RosterTable` reuse**: admin `RosterTable` is strongly coupled to `adminRoster` i18n namespace + unenroll callbacks. Teacher view is read-only. **Decision: do NOT promote `RosterTable` to `components/shared/` yet (it requires structural change to strip actions). Create `TeacherRosterTable` as a feature-local component (`features/teacher/presentation/teacher-class-students/`) that reuses the same visual pattern but without checkboxes/unenroll columns. Promote to `components/shared/` when admin roster also needs a read-only variant (second use).**

5. **`totalClasses` stat card**: `TeacherDashboardStats` currently has no `totalClasses` field. `classesToday` is a different concept. Add `totalClasses: number` to `dashboard-stats.entity.ts`; populate from `listMyClasses().length` in the dashboard use-case (already calls the class list for `getTotalStudents` — piggyback count). The dashboard VM and client component need a new stat card. This wires AC-4.

**ADR flags:**
- `homeroomTeacherId` presence in TEACHER-scoped class list response — needs BE confirmation. Flag for ADR if it requires contract change (candidate: `0024-…`). Engineer must verify before Phase 2.
- `sub` claim in JWT for current teacher userId comparison — `jwt.ts` does not yet expose `decodeSub()`. Add it or decode inline; no ADR needed (small pure util add).

---

### Phase 1 — Domain extension

**Goal**: typed domain objects + use-case contracts, no HTTP, TDD first.

**Files to create/modify:**

| Action | File | Layer |
|--------|------|-------|
| MODIFY | `features/teacher/domain/entities/teacher-class.entity.ts` | domain |
| CREATE | `features/teacher/domain/entities/teacher-roster-student.entity.ts` | domain |
| MODIFY | `features/teacher/domain/entities/dashboard-stats.entity.ts` | domain |
| MODIFY | `features/teacher/domain/failures/teacher-dashboard.failure.ts` | domain |
| CREATE | `features/teacher/domain/repositories/i-teacher-class.repository.ts` | domain |
| CREATE | `features/teacher/domain/use-cases/list-my-classes.use-case.ts` | domain |
| CREATE | `features/teacher/domain/use-cases/list-my-classes.use-case.test.ts` | domain |
| CREATE | `features/teacher/domain/use-cases/get-class-students.use-case.ts` | domain |
| CREATE | `features/teacher/domain/use-cases/get-class-students.use-case.test.ts` | domain |

**Entity changes:**
- `TeacherClass`: add `isHomeroom: boolean`, `academicYearLabel: string`
- `TeacherRosterStudent`: new entity `{ id: string; name: string; dob: string; gender: "F" | "M"; status: "active" | "transferred" }` (mirrors `RosterStudent` to keep teacher domain self-contained; no cross-feature entity import)
- `TeacherDashboardStats`: add `totalClasses: number`
- `TeacherDashboardFailure`: add `{ type: "not-found" }` (for classId not found on student fetch)

**New repository interface `ITeacherClassRepository`:**
```ts
listMyClasses(): Promise<Result<TeacherClass[]>>
getClassStudents(classId: string): Promise<Result<TeacherRosterStudent[]>>
```
Uses same `Result<T>` type from `i-teacher-dashboard.repository.ts` — re-export from a shared `result.ts` or import from dashboard repo file (keep simple: reference dashboard repo's `Result` type in the new interface file).

**Use-case contracts:**
- `ListMyClassesUseCase.execute()` → `Result<TeacherClass[]>` — delegates to repo; no business logic beyond pass-through (YAGNI; sorting/filtering = presentation concern)
- `GetClassStudentsUseCase.execute(classId: string)` → `Result<TeacherRosterStudent[]>`

**Test first (red):**
- `list-my-classes.use-case.test.ts` — mock `ITeacherClassRepository` returning 2 classes (one homeroom), assert `ok + data.length === 2`, `data[0].isHomeroom === true`; assert failure propagation when repo returns `network-error`
- `get-class-students.use-case.test.ts` — mock repo returning 3 students, assert count; assert failure on `not-found`

**Done when:** unit tests green, `tsc --noEmit` clean.

---

### Phase 2 — Infrastructure (DTOs, mappers, repositories)

**Goal:** HTTP layer wired to `core` service; mock repo for local dev; integration-ready.

**Files to create/modify:**

| Action | File | Layer |
|--------|------|-------|
| MODIFY | `features/teacher/infrastructure/dtos/teacher-class-response.dto.ts` | infra |
| MODIFY | `features/teacher/infrastructure/dtos/class-roster-response.dto.ts` | infra |
| MODIFY | `features/teacher/infrastructure/mappers/teacher-dashboard.mapper.ts` | infra |
| CREATE | `features/teacher/infrastructure/mappers/teacher-class.mapper.ts` | infra |
| CREATE | `features/teacher/infrastructure/repositories/teacher-class.repository.ts` | infra |
| CREATE | `features/teacher/infrastructure/repositories/mock-teacher-class.repository.ts` | infra |
| MODIFY | `features/teacher/infrastructure/repositories/teacher-dashboard.repository.ts` | infra |

**DTO changes:**
- `TeacherClassResponseDto`: add `homeroomTeacherId: string | null` (nullable — present if BE returns it, `null` otherwise)
- `ClassRosterItemDto`: extend to `{ enrollmentId, classId, studentMemberId, studentName: string, studentCode: string, dob: string, gender: string, status: string, academicYearLabel, enrolledAt }` — add student-level fields. Mark `studentName` as potentially absent (`string | undefined`) until BE contract is confirmed; mapper falls back to `studentMemberId` as display name.

**Mapper:**
- New `teacher-class.mapper.ts`:
  - `toTeacherClassFromDto(dto: TeacherClassResponseDto, currentUserId: string): TeacherClass` — sets `isHomeroom = dto.homeroomTeacherId === currentUserId`
  - `toTeacherRosterStudent(dto: ClassRosterItemDto): TeacherRosterStudent`

**Repository `TeacherClassRepository`** (`import 'server-only'`):
- `listMyClasses(currentUserId: string)`: `GET TEACHER_EP.classes` cursor-paginated (same `fetchAllPages` pattern as dashboard repo), maps with `toTeacherClassFromDto`
- `getClassStudents(classId: string)`: `GET TEACHER_EP.classStudents(classId)` cursor-paginated, maps with `toTeacherRosterStudent`
- Error mapping: reuse `toTeacherDashboardFailure` (same failure union type)
- Note: `currentUserId` is passed in from the DI factory (decoded from JWT `sub` claim) — repository does not read cookies directly.

**Dashboard repo change:** add `getTotalClasses()` → calls `fetchAllPages(TEACHER_EP.classes)` and returns `.length`. OR: DI factory computes count from `listMyClasses()` result in the dashboard use-case. **Preferred**: add `getTotalClasses()` to `ITeacherDashboardRepository` + implement in `TeacherDashboardRepository` (keeps dashboard data self-contained; avoids cross-repo dependency in use-case). Update mock repo accordingly.

**Mock repo `MockTeacherClassRepository`:** 3 hardcoded classes (2 regular, 1 homeroom), 10 hardcoded students — satisfies Storybook + local dev.

**Integration test (red first):**
- `teacher-class.repository.test.ts`: mock Axios, stub envelope response with 2 classes, assert `listMyClasses` returns mapped entities with correct `isHomeroom`; stub empty next cursor; assert single page consumed.

**Done when:** integration tests green.

---

### Phase 3 — DI factories + endpoint constants

**Goal:** wiring layer; server-only; no new business logic.

**Files to create/modify:**

| Action | File | Layer |
|--------|------|-------|
| MODIFY | `bootstrap/endpoint/teacher.endpoint.ts` | bootstrap/endpoint |
| CREATE | `bootstrap/di/teacher-class.di.ts` | bootstrap/di |
| MODIFY | `bootstrap/di/teacher-dashboard.di.ts` | bootstrap/di |
| MODIFY | `bootstrap/di/index.ts` (if exists) | bootstrap/di |
| MODIFY | `bootstrap/lib/jwt.ts` | bootstrap/lib |

**Endpoint:** `TEACHER_EP` already has `classes` + `classStudents(classId)`. No new endpoints needed unless `classHomeroomTeacher` lookup is required — deferred to open questions.

**JWT util:** add `decodeSubClaim(token: string): string | null` to `bootstrap/lib/jwt.ts` (pure, tests in `jwt.test.ts`). Used by DI factory to resolve `currentUserId`.

**DI factory `teacher-class.di.ts`:**
```ts
import 'server-only'
export async function makeListMyClassesUseCase() {
  const http = await createServerHttpClient()
  const token = await getAccessToken()
  const currentUserId = token ? decodeSubClaim(token) : null
  const repo = USE_MOCK
    ? new MockTeacherClassRepository()
    : new TeacherClassRepository(http, currentUserId ?? '')
  return new ListMyClassesUseCase(repo)
}
export async function makeGetClassStudentsUseCase() { ... }
```

**Dashboard DI update:** `makeGetTeacherDashboardUseCase` passes `getTotalClasses()` from the updated dashboard repo (no factory change needed if the method is on the same repo).

**Done when:** `tsc --noEmit` clean; DI factories importable from `app/actions.ts` equivalent.

---

### Phase 4 — App Router pages + i18n

**Goal:** RSC pages at correct routes; i18n keys added.

**Files to create/modify:**

| Action | File | Layer |
|--------|------|-------|
| CREATE | `app/[locale]/t/[tenant]/(app)/teacher/classes/page.tsx` | app (RSC) |
| CREATE | `app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/students/page.tsx` | app (RSC) |
| MODIFY | `bootstrap/i18n/messages/vi.json` | bootstrap/i18n |
| MODIFY | `bootstrap/i18n/messages/en.json` | bootstrap/i18n |

**i18n namespace `teacherClasses`** (add to both `vi.json` + `en.json`):
```json
"teacherClasses": {
  "pageTitle": "Lớp của tôi",
  "studentsPageTitle": "Danh sách học sinh — {className}",
  "grade": "Khối {level}",
  "studentCount": "{count} học sinh",
  "homeroomBadge": "GVCN",
  "viewStudents": "Xem học sinh",
  "takeAttendance": "Điểm danh",
  "classLog": "Sổ đầu bài",
  "empty": {
    "title": "Bạn chưa được phân công lớp nào",
    "body": "Liên hệ quản trị viên để được phân công lớp học."
  },
  "error": {
    "retry": "Thử lại",
    "network-error": "Không thể tải danh sách lớp. Kiểm tra kết nối và thử lại.",
    "unauthorized": "Bạn không có quyền xem thông tin này.",
    "unknown": "Đã xảy ra lỗi. Vui lòng thử lại."
  },
  "students": {
    "name": "Họ và tên",
    "studentCode": "Mã học sinh",
    "dob": "Ngày sinh",
    "gender": "Giới tính",
    "status": "Trạng thái",
    "searchPlaceholder": "Tìm học sinh…",
    "clearSearch": "Xóa tìm kiếm",
    "noMatch": "Không tìm thấy học sinh",
    "empty": "Lớp chưa có học sinh"
  }
}
```
Also add `"teacherDashboard.stats.totalClasses": "Lớp học"` key to dashboard stats.

**RSC page `classes/page.tsx`:**
- Calls `makeListMyClassesUseCase().execute()`
- Maps to `TeacherClassesVM` and renders `<TeacherClassesScreen vm={...} />`
- On failure: passes `error` prop to screen (no throw — screen handles states)

**RSC page `classes/[classId]/students/page.tsx`:**
- `params: { classId: string }`
- Calls `makeGetClassStudentsUseCase().execute(classId)`
- Also fetches class name (from `listMyClasses` or a separate `getClass(classId)` — prefer passing classId + fetching classes list already in-flight; or just display classId until class detail endpoint is wired — see open questions)
- Renders `<TeacherClassStudentsScreen vm={...} />`

**Done when:** pages render (dev server), i18n keys pass `tsc`.

---

### Phase 5 — Presentation components

**Goal:** UI components; TDD via Storybook interaction.

**Files to create:**

| File | Layer |
|------|-------|
| `features/teacher/presentation/teacher-classes/teacher-classes.i-vm.ts` | presentation |
| `features/teacher/presentation/teacher-classes/teacher-classes.tsx` | presentation |
| `features/teacher/presentation/teacher-classes/components/class-card.tsx` | presentation |
| `features/teacher/presentation/teacher-classes/components/class-card-skeleton.tsx` | presentation |
| `features/teacher/presentation/teacher-class-students/teacher-class-students.i-vm.ts` | presentation |
| `features/teacher/presentation/teacher-class-students/teacher-class-students.tsx` | presentation |
| `features/teacher/presentation/teacher-class-students/components/teacher-roster-table.tsx` | presentation |

**ViewModels:**

`TeacherClassesVM`:
```ts
interface ClassCardVM {
  id: string
  name: string
  gradeLevel: number
  studentCount: number
  isHomeroom: boolean
  studentsPath: string  // app-relative route
}
interface TeacherClassesVM {
  classes: ClassCardVM[]
  errorKey: TeacherDashboardFailure['type'] | null
}
```

`TeacherClassStudentsVM`:
```ts
interface RosterStudentVM {
  id: string; name: string; dob: string; gender: 'F' | 'M'; status: 'active' | 'transferred'
}
interface TeacherClassStudentsVM {
  className: string
  students: RosterStudentVM[]
  errorKey: TeacherDashboardFailure['type'] | null
}
```

**`ClassCard`**: white card (`bg-edu-card rounded-[12px] shadow-card`), icon box 52×52 (`bg-primary/[0.12]`, radius 12), class name 15px/700, grade label 12px/700 muted uppercase, student count 26px/800. GVCN badge: `<StatusBadge tone="success">GVCN</StatusBadge>`. Actions: three ghost buttons "Xem học sinh", "Điểm danh" (disabled + tooltip "Sắp có"), "Sổ đầu bài" (disabled). Touch target ≥ 44×44px for all buttons. Grid layout: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4`.

**`TeacherRosterTable`** (`use client`): read-only table — no checkboxes, no unenroll button. Columns: #, name (avatar + name), student code, dob, gender, status. Client-side search (`useState`). Client-side pagination (PAGE_SIZE = 10). Reuses `StatusBadge`, `GenderBadge` (promote `GenderBadge` to `components/shared/` if teacher table needs it — currently feature-local in admin-roster). **Flag**: if `GenderBadge` is used in teacher roster, it needs promoting (second use = shared). Check component-organization rule at implementation time.

**Dashboard stat update**: add `totalClasses` stat card to `TeacherDashboardHomeClient` and `TeacherDashboardVM`. Uses `BookOpen` lucide icon, `tone="warning"`. i18n key: `teacherDashboard.stats.totalClasses`.

**Done when:** components render correct states, a11y rules satisfied, design-review gate passed.

---

### Phase 6 — Storybook stories

**Files to create:**

| File |
|------|
| `features/teacher/presentation/teacher-classes/teacher-classes.stories.tsx` |
| `features/teacher/presentation/teacher-class-students/teacher-class-students.stories.tsx` |

**Story states — `teacher-classes.stories.tsx`:**
- `Loading` — skeleton cards (3 placeholders)
- `Empty` — empty state (no classes assigned)
- `WithClasses` — 3 class cards (2 regular, 1 homeroom with GVCN badge)
- `Error` — error state with retry

**Story states — `teacher-class-students.stories.tsx`:**
- `Loading` — skeleton rows
- `Empty` — no students
- `WithStudents` — 10 students, mixed gender/status
- `Error`

**Storybook interaction test** (using `@storybook/test`):
- `WithClasses`: assert GVCN badge present on homeroom card; assert "Xem học sinh" button navigates (mock router)
- `WithStudents`: assert search filters rows; assert pagination controls

**Done when:** stories render without console errors; interaction tests pass in `bun storybook`.

---

### Phase 7 — Test gate + build

**Checklist:**
- [ ] `bun vitest run` — all unit + integration tests green
- [ ] `bunx tsc --noEmit` — no type errors
- [ ] `bun lint` — Biome clean
- [ ] `bun build` — production build succeeds
- [ ] `docs/TEST_MATRIX.md` — US-E13.1 row updated to `implemented`
- [ ] Design-review gate: `/impeccable audit` on class cards + student table
- [ ] WCAG 2.1 AA: keyboard navigation on class cards; focus ring on all interactive elements; `aria-label` on icon-only buttons

---

### Risks, dependencies, open questions

**[OPEN QUESTION — BE CONTRACT]** Does `GET /core/api/v1/classes` (TEACHER scope) return `homeroomTeacherId` on each item? The admin `ClassResponseDto` has it; the teacher `TeacherClassResponseDto` does not. If absent, the engineer must choose: (a) call `GET /classes/{classId}/homeroom-teacher` per class in parallel — adds N+1 calls; (b) accept `isHomeroom: false` as fallback + flag for BE to add the field. **Recommend option (b) with mock = true for `isHomeroom` in mock repo so the GVCN badge is testable.**

**[OPEN QUESTION — STUDENT NAME]** Does `GET /core/api/v1/classes/{classId}/students` (TEACHER scope) return student name/code? Current `ClassRosterItemDto` has only `studentMemberId`. Admin roster uses a different path (`ROSTER_EP.classStudents`). If the endpoint returns only enrollment data: mock-first for student name (`USE_MOCK`) until BE enriches the response. Do NOT call IAM `/members/{memberId}` per student (N+1, out of scope for this US).

**[OPEN QUESTION — CLASS NAME ON STUDENTS PAGE]** Students page needs the class name for breadcrumb/title. Options: (a) call `GET /core/api/v1/classes/{classId}` (add to `TEACHER_EP`); (b) derive from `listMyClasses()` result cached in the RSC (call both use-cases in parallel in the students page). **Recommend (b): students page calls `listMyClasses()` + `getClassStudents(classId)` in parallel; filter by classId for name.** Avoids a new endpoint constant.

**[ADR CANDIDATE]** If `homeroomTeacherId` requires a BE contract change to the TEACHER-scoped class list response → flag to `fe-lead` for an ADR (next: ≥ 0024).

**Dependency risk:** `GenderBadge` currently lives in `admin-roster/presentation/student-roster-screen/components/gender-badge.tsx`. If teacher roster reuses it, it must be promoted to `components/shared/gender-badge/` per component-organization rule. This is a Phase 5 decision — engineer must grep before creating a duplicate.

---

## State Architecture

### 1. State Architecture Summary

Both screens are **pure read, no mutations**. All domain data is fetched server-side in RSC and delivered to client components as ViewModel props. There is no TanStack Query on either screen — the pattern precisely mirrors `TeacherDashboard` (RSC → use-case → ViewModel → `'use client'` component). The only client state is local UI state: a search filter string and a pagination page counter inside `TeacherRosterTable`. No global store is introduced.

The teacher dashboard stat "Lớp học" (`totalClasses`) is wired by extending the existing `ITeacherDashboardRepository` + `TeacherDashboardStats` entity; the new count is fetched server-side at the same time as `totalStudents` already is, and lands in `TeacherDashboardVM` as a new `totalClasses` field.

**No TanStack Query used.** Rationale: both screens are read-only with no client-triggered refetch, no optimistic mutation, and no realtime invalidation path. RSC pre-fetches the full dataset server-side. Adding TanStack Query would add a waterfall (RSC → page → client query → render) without benefit. Decision consistent with the existing `TeacherDashboard` pattern.

**No global store.** Local filter and page index are UI concerns scoped to a single component instance. They are not shared across routes and do not need persistence.

---

### 2. State Inventory

| State item | Type | Owner | TypeScript shape | Reason |
|---|---|---|---|---|
| Teacher's class list | Server state | RSC (`classes/page.tsx`) | `TeacherClass[]` (entity) | Fetched once at request time; no mutations; map to VM prop |
| Student roster for a class | Server state | RSC (`[classId]/students/page.tsx`) | `TeacherRosterStudent[]` (entity) | Same — read-only; N students pre-loaded |
| Class name for breadcrumb | Server state | RSC (`[classId]/students/page.tsx`) | `string` (derived from `TeacherClass` list) | Derived by filtering `listMyClasses()` result by `classId`; no extra endpoint |
| Error key (classes page) | Server state | RSC, passed as VM prop | `TeacherDashboardFailure['type'] \| null` | Failure union stable key → presentation translates to i18n copy |
| Error key (students page) | Server state | RSC, passed as VM prop | `TeacherDashboardFailure['type'] \| null` | Same pattern |
| Search filter string | Local form / UI | `TeacherRosterTable` (`'use client'`) | `string` via `useState` | Single-component; not shared; no URL state needed (transient) |
| Current page index | Local UI | `TeacherRosterTable` (`'use client'`) | `number` via `useState` | Client-side pagination of pre-loaded rows; reset to 0 on search change |
| `totalClasses` dashboard stat | Server state | RSC (`teacher/page.tsx` via `TeacherDashboard`) | `number \| null` (in `TeacherDashboardVM`) | Extended from existing `TeacherDashboardStats`; fetched alongside `totalStudents` |

---

### 3. State Flow

#### `/teacher/classes` — class list screen

```
RSC: classes/page.tsx
  └─ await makeListMyClassesUseCase().execute()
       └─ TeacherClassRepository.listMyClasses(currentUserId)
            └─ fetchAllPages(TEACHER_EP.classes) → TeacherClassResponseDto[]
                 └─ toTeacherClassFromDto(dto, currentUserId) → TeacherClass[]
  └─ map TeacherClass[] → TeacherClassesVM { classes: ClassCardVM[], errorKey }
  └─ <TeacherClassesScreen vm={...} />   ← 'use client'
       └─ renders ClassCard grid (no client state needed)
```

#### `/teacher/classes/[classId]/students` — student roster screen

```
RSC: [classId]/students/page.tsx
  └─ await Promise.all([
       makeListMyClassesUseCase().execute(),      // to derive class name
       makeGetClassStudentsUseCase().execute(classId)
     ])
  └─ derive: className = classes.find(c => c.id === classId)?.name ?? classId
  └─ map → TeacherClassStudentsVM { className, students: RosterStudentVM[], errorKey }
  └─ <TeacherClassStudentsScreen vm={...} />   ← 'use client'
       └─ TeacherRosterTable
            ├─ useState(searchFilter: string)       ← local
            └─ useState(currentPage: number)        ← local
```

#### Dashboard `totalClasses` stat wiring

```
RSC: teacher/page.tsx
  └─ TeacherDashboard (async RSC component)
       └─ makeGetTeacherDashboardUseCase().execute()
            └─ ITeacherDashboardRepository.getTotalClasses()   ← NEW method
                 └─ fetchAllPages(TEACHER_EP.classes) → .length
  └─ vm.totalClasses = result.data.stats.totalClasses
  └─ <TeacherDashboardHomeClient vm={...} />
```

No SSE invalidation, no mutation paths, no TanStack Query involved on any of these screens.

---

### 4. Query Key Hierarchy + Cache Policy

**No TanStack Query keys defined for this US.** Both screens are pure RSC data flow (server-fetched at request time, delivered as props). There are no client-side queries, no `useQuery` calls, and no cache to manage.

If a future US adds client-side refetch (e.g., live attendance count on the class card), the key factory to adopt at that point would be:

```ts
// Proposed future key factory — NOT implemented in this US
export const teacherClassKeys = {
  all:     () => ['teacherClass']             as const,
  lists:   () => ['teacherClass', 'list']     as const,
  list:    () => ['teacherClass', 'list', {}] as const,
  detail:  (id: string) => ['teacherClass', 'detail', id] as const,
  roster:  (classId: string) => ['teacherClass', 'roster', classId] as const,
}
```

`staleTime` and `gcTime` deferred until the key factory is actually needed.

---

### 5. Invalidation Map

No TanStack Query cache exists for this US → no invalidation map required.

When downstream stories add mutations (e.g., US-E13.2 attendance write-back, US-E12.10 class management), they will need to invalidate against the key factory above. At that point, an invalidation table entry will be: `submitAttendance mutation → invalidate teacherClassKeys.roster(classId)`.

---

### 6. Mutations and Optimistic Strategy

No mutations in this US. Both screens are read-only.

`onMutate` / `onError` / `onSettled` patterns are not applicable. No rollback context needed.

---

### 7. Async State Machine

Each screen has three states driven entirely by what the RSC passes in the ViewModel:

#### Classes page (`TeacherClassesScreen`)

| State | Trigger | VM shape | UI treatment |
|---|---|---|---|
| **Loading** | RSC `Suspense` boundary | — | Skeleton cards (`ClassCardSkeleton` × 3), layout preserved |
| **Error** | `vm.errorKey !== null` | `classes: []`, `errorKey: "network-error" \| "unauthorized" \| "unknown"` | Inline error block; i18n key `teacherClasses.error.<errorKey>`; retry = full page reload (`window.location.reload`) |
| **Empty** | `vm.classes.length === 0 && vm.errorKey === null` | `classes: []` | `teacherClasses.empty.title` + `teacherClasses.empty.body` |
| **Success** | `vm.classes.length > 0` | `classes: ClassCardVM[]` | Card grid |

#### Students page (`TeacherClassStudentsScreen` + `TeacherRosterTable`)

| State | Trigger | VM / local shape | UI treatment |
|---|---|---|---|
| **Loading** | RSC `Suspense` boundary | — | Skeleton rows × 5 |
| **Error** | `vm.errorKey !== null` | `students: []`, `errorKey` | `teacherClasses.error.<errorKey>` inline |
| **Empty (server)** | `vm.students.length === 0 && errorKey === null` | `students: []` | `teacherClasses.students.empty` |
| **No search match** | `filtered.length === 0 && searchFilter !== ""` | local filter state | `teacherClasses.students.noMatch`; clear-search button |
| **Success** | `vm.students.length > 0` | `students: RosterStudentVM[]` | Paginated table |

#### Failure union → i18n key mapping

```
TeacherDashboardFailure.type  →  i18n key path
─────────────────────────────────────────────────
"network-error"               →  teacherClasses.error.network-error
"unauthorized"                →  teacherClasses.error.unauthorized
"unknown"                     →  teacherClasses.error.unknown
```

All error keys are stable (`TeacherDashboardFailure['type']`); the presentation layer calls `t(errorKey)` — no raw strings from the server reach the client.

The `not-found` failure type (added in Phase 1 for `getClassStudents` when `classId` is invalid) maps to `teacherClasses.error.not-found` — this key must be added to both `vi.json` and `en.json` alongside the others.

---

### 8. Race Conditions and Resolution

| Scenario | Analysis | Resolution |
|---|---|---|
| Concurrent RSC renders for the same teacher | Each RSC request is an independent server-side execution; each creates its own DI factory instance with its own HTTP client. No shared mutable state between requests. | No action needed — stateless by design. |
| `Promise.all` in students page RSC (classes + roster) | If one leg fails and the other succeeds, `firstError` logic (same pattern as `GetTeacherDashboardUseCase`) surfaces the failure. Both promises are awaited together; there is no partial-success state exposed to the client. | The VM receives `errorKey !== null`; both `className` and `students` fall back to safe defaults. |
| Student count derivation during `listMyClasses` + `getTotalClasses` on dashboard | `getTotalClasses()` is an independent `fetchAllPages` call. It runs inside `Promise.all` in `GetTeacherDashboardUseCase` alongside `getTotalStudents()`. Both drain the same cursor-paginated class list endpoint in separate HTTP requests (no shared state). If BE returns different page counts across concurrent requests (cursor drift), the two results may differ by at most one page — acceptable for stat card display. | Accept eventual consistency for dashboard stat counts; not a hard integrity requirement. |
| `searchFilter` reset on roster data change | Roster data is static (loaded once from RSC props). `searchFilter` and `currentPage` are local `useState` values that only change on user input. There is no async re-fetch that could race with local state updates. | No race condition exists. |
| `currentPage` stale after search change | Filtering reduces the visible row count; a previously valid `currentPage` may point past the last page. | Reset `currentPage` to `0` inside the `setSearchFilter` handler (co-located state update in one `useState` dispatch or a `useEffect` watching `searchFilter`). |

---

## Component Architecture

Designed by `fe-component-architect`. Authoritative for Phase 5 (presentation) implementation.

---

### 1. Architecture Summary

**Feature scope:** Two new screens inside `src/features/teacher/presentation/`. No
shared-component promotions are required at story creation time, with one mandatory
exception: `GenderBadge` must be promoted before the teacher table is written (second
use triggers the component-organization rule).

**New components (net-new):**
- `TeacherClassesScreen` — screen-level `'use client'` container
- `ClassCard` — feature-local composed leaf (class name + grade + count + GVCN badge + actions)
- `ClassCardSkeleton` — feature-local skeleton placeholder
- `ClassesEmptyState` — feature-local read-only empty state
- `ClassesErrorState` — feature-local error + retry state
- `TeacherClassStudentsScreen` — screen-level `'use client'` container
- `TeacherRosterBreadcrumb` — feature-local static breadcrumb (no dropdown class-switcher)
- `TeacherRosterTable` — feature-local read-only table (search + client-side pagination)

**Reused from codebase unchanged:**
- `components/shared/stat-card/StatCard` (default variant, `tone="warning"`) — totalClasses stat on dashboard
- `components/shared/status-badge/StatusBadge` — GVCN badge in ClassCard; enrollment status in TeacherRosterTable
- `components/ui/skeleton/Skeleton` — base for ClassCardSkeleton + table skeleton rows
- `components/ui/avatar/Avatar` + `AvatarFallback` — student name cell
- `components/ui/tooltip/Tooltip`, `TooltipTrigger`, `TooltipContent` — "Sắp có" on disabled action buttons (already present, no `bun ui:add`)
- `components/ui/button/Button` — action buttons in ClassCard; retry in error state

**Missing shadcn primitives — none.** `tooltip` is at `src/components/ui/tooltip/`. No `bun ui:add` required for this story.

**`GenderBadge` promotion — mandatory:**
`TeacherRosterTable` is the second consumer of `GenderBadge`. Per `component-organization.md`
rule, it MUST be moved to `components/shared/gender-badge/` before the teacher table is
implemented. The promoted API removes the hardcoded `useTranslations("adminRoster")` call
and accepts caller-provided label strings instead. Admin-roster import path updates accordingly.

---

### 2. Component Tree

```
Screen 1: /teacher/classes
─────────────────────────────────────────────────────────────────
app/[locale]/t/[tenant]/(app)/teacher/classes/page.tsx   [RSC]
└── TeacherClassesScreen                                  ['use client' — controlled by VM props]
    ├── <h1> page title (sr-only)                         [presentational]
    ├── [isLoading=true] ClassCardSkeletonGrid             [presentational]
    │   └── ClassCardSkeleton × 3                         [presentational — Skeleton primitive]
    ├── [errorKey!=null] ClassesErrorState                 [presentational — Button retry prop]
    ├── [classes=[]]     ClassesEmptyState                 [presentational]
    └── [classes.length>0]
        └── <ul role="list"> class grid                   [presentational]
            └── ClassCard × N                             [presentational, props-only]
                ├── <div> icon box (BookOpen lucide)       [presentational]
                ├── <h2> class name                        [presentational]
                ├── <p>  grade label (Khối N)              [presentational]
                ├── <p>  student count                     [presentational]
                ├── [isHomeroom] StatusBadge tone="success" [REUSED — components/shared]
                ├── <Link> "Xem học sinh"                  [presentational — next/link]
                ├── Tooltip > disabled <button> "Điểm danh"  [REUSED Tooltip — ui/tooltip]
                └── Tooltip > disabled <button> "Sổ đầu bài" [REUSED Tooltip — ui/tooltip]

Screen 2: /teacher/classes/[classId]/students
─────────────────────────────────────────────────────────────────
app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/students/page.tsx  [RSC]
└── TeacherClassStudentsScreen                            ['use client' — controlled by VM props]
    ├── TeacherRosterBreadcrumb                           [presentational, props-only]
    │   └── <nav aria-label="breadcrumb"><ol>
    │       ├── <li><Link> "Lớp học"                      [navigable]
    │       ├── <li> separator (aria-hidden)
    │       ├── <li> className text
    │       ├── <li> separator (aria-hidden)
    │       └── <li aria-current="page"> "Học sinh"
    ├── <h1> page title                                   [presentational]
    ├── [isLoading=true] skeleton rows × 5                [presentational — Skeleton]
    ├── [errorKey!=null] inline error + retry             [presentational — Button]
    └── TeacherRosterTable                               ['use client' — owns search+page state]
        ├── search toolbar (<label> wrapping <input>)     [internal: searchFilter useState]
        ├── [filteredRows=[]] empty/noMatch inline row    [presentational]
        ├── <table>                                       [presentational]
        │   ├── <thead> with <th scope="col"> × 6        [presentational]
        │   └── <tbody> rows
        │       ├── # index                              [presentational]
        │       ├── Avatar + AvatarFallback + name       [REUSED — ui/avatar]
        │       ├── studentMemberId (font-mono)          [presentational]
        │       ├── dob                                  [presentational]
        │       ├── GenderBadge                          [PROMOTED → shared/gender-badge]
        │       └── StatusBadge tone="success"|"muted"   [REUSED — shared/status-badge]
        └── pagination controls (prev/next/page-of)      [internal: currentPage useState]

Dashboard patch (AC-4):
─────────────────────────────────────────────────────────────────
TeacherDashboardHomeClient (existing 'use client')
└── stats grid — add one StatCard:
    StatCard label="Lớp học" value={totalClasses??'—'} icon={BookOpen} tone="warning"
    [REUSED — components/shared/stat-card, no modification to StatCard itself]
```

**Classification legend:**
- `RSC` — React Server Component; fetches use-case result, maps to VM, passes props.
- `'use client'` — client boundary; receives VM via props only; no DI/infra imports.
- `presentational` — stateless props-only leaf; no hooks.
- `internal` — ephemeral local state owned by this component; must NOT be lifted.

---

### 3. ViewModel + Prop Interfaces

#### 3a. `teacher-classes.i-vm.ts`

**Path:** `src/features/teacher/presentation/teacher-classes/teacher-classes.i-vm.ts`

```ts
import type { TeacherDashboardFailure } from
  "@/features/teacher/domain/failures/teacher-dashboard.failure";

/** VM shape for one class card — built by RSC from TeacherClass entity. */
export interface ClassCardVM {
  /** Entity id — React key + route parameter. */
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
  isHomeroom: boolean;
  academicYearLabel: string;
  /** App-relative route pre-computed by RSC:
   *  `/teacher/classes/{id}/students` */
  studentsPath: string;
}

/** Top-level ViewModel: RSC → TeacherClassesScreen. */
export interface TeacherClassesVM {
  classes: ClassCardVM[];
  /** null = success; non-null = stable failure type from domain union. */
  errorKey: TeacherDashboardFailure["type"] | null;
  /** true while RSC Suspense boundary resolves (skeleton rendered by fallback). */
  isLoading: boolean;
}
```

#### 3b. `teacher-class-students.i-vm.ts`

**Path:** `src/features/teacher/presentation/teacher-class-students/teacher-class-students.i-vm.ts`

```ts
import type { TeacherDashboardFailure } from
  "@/features/teacher/domain/failures/teacher-dashboard.failure";

/** VM shape for one student row — built by RSC from TeacherRosterStudent entity. */
export interface RosterStudentVM {
  id: string;
  name: string;
  /** Last-word initial of name, uppercased — for AvatarFallback. */
  initials: string;
  studentMemberId: string;
  dob: string;
  gender: "F" | "M";
  status: "active" | "transferred";
}

/** Top-level ViewModel: RSC → TeacherClassStudentsScreen. */
export interface TeacherClassStudentsVM {
  /** Resolved class name for breadcrumb + page title.
   *  Falls back to classId string if class not found. */
  className: string;
  classId: string;
  students: RosterStudentVM[];
  errorKey: TeacherDashboardFailure["type"] | null;
  isLoading: boolean;
}
```

#### 3c. Dashboard VM patch

**File to modify:**
`src/features/teacher/presentation/teacher-dashboard-home/teacher-dashboard-home.i-vm.ts`

Add to existing `TeacherDashboardVM` interface:

```ts
/** Count of classes assigned to this teacher. null = unavailable (error/loading). */
totalClasses: number | null;
```

#### 3d. Component prop interfaces

**`ClassCardProps`** (feature-local presentational leaf):

```ts
interface ClassCardProps {
  vm: ClassCardVM;
  /** All translated strings injected from parent (parent calls useTranslations).
   *  ClassCard is i18n-agnostic — pure presentational, no hooks. */
  labels: {
    grade: string;          // "Khối {N}" — pre-formatted by parent
    studentCount: string;   // "{N} học sinh" — pre-formatted by parent
    homeroomBadge: string;  // "GVCN"
    viewStudents: string;   // "Xem học sinh"
    takeAttendance: string; // "Điểm danh"
    classLog: string;       // "Sổ đầu bài"
    comingSoon: string;     // tooltip text "Sắp có"
  };
}
```

**`ClassesEmptyStateProps`** (feature-local):

```ts
interface ClassesEmptyStateProps {
  title: string;
  body: string;
}
```

**`ClassesErrorStateProps`** (feature-local):

```ts
interface ClassesErrorStateProps {
  message: string;
  retryLabel: string;
  /** Triggers router.refresh() — no Server Action; full RSC re-render. */
  onRetry: () => void;
}
```

**`TeacherRosterBreadcrumbProps`** (feature-local):

```ts
interface TeacherRosterBreadcrumbProps {
  /** Translated root crumb label, e.g. "Lớp học". */
  rootLabel: string;
  rootHref: string;  // "/teacher/classes"
  /** Resolved class name — middle crumb text. */
  className: string;
  /** Translated leaf label, e.g. "Học sinh". */
  leafLabel: string;
}
```

**`TeacherRosterTableProps`** (feature-local):

```ts
interface TeacherRosterTableProps {
  students: RosterStudentVM[];
  /** All translated strings injected from parent screen component.
   *  TeacherRosterTable is i18n-agnostic — owns no useTranslations call. */
  labels: {
    searchPlaceholder: string;
    clearSearch: string;
    noMatch: string;
    empty: string;
    colIndex: string;   // "#" — sr-only header
    colName: string;
    colCode: string;
    colDob: string;
    colGender: string;
    colStatus: string;
    statusActive: string;
    statusTransferred: string;
    /** Forwarded to promoted GenderBadge. */
    femaleLabel: string;
    maleLabel: string;
    prevPage: string;
    nextPage: string;
    /** e.g. "Trang {page} / {total}" — pre-formatted by parent or formatted inline */
    pageOf: (page: number, total: number) => string;
  };
}
```

**`GenderBadgeProps`** (promoted shared component):

```ts
// src/components/shared/gender-badge/gender-badge.tsx
interface GenderBadgeProps {
  gender: "F" | "M";
  /** Caller-provided accessible label for the female indicator (translated). */
  femaleLabel: string;
  /** Caller-provided accessible label for the male indicator (translated). */
  maleLabel: string;
}
```

Removes the `useTranslations("adminRoster")` call. Admin-roster caller passes
`t("table.genderFemale")` / `t("table.genderMale")`. Teacher caller passes
`t("teacherClasses.students.genderFemale")` / `t("teacherClasses.students.genderMale")`.

---

### 4. State Ownership (contract level)

| State | Owner | Kind | Notes |
|---|---|---|---|
| `classes: ClassCardVM[]` | RSC page | controlled prop | Server-fetched; no client refetch in this US |
| `students: RosterStudentVM[]` | RSC page | controlled prop | Same |
| `errorKey` | RSC page | controlled prop | Stable failure type key; `null` = success |
| `isLoading` | Suspense boundary | controlled prop / fallback | Skeleton is the Suspense `fallback`; VM `isLoading` flag is a safety valve for explicit loading states |
| `searchFilter: string` | `TeacherRosterTable` | internal `useState` | Ephemeral client filter; not shared across routes |
| `currentPage: number` | `TeacherRosterTable` | internal `useState` | Client-side pagination; reset to `1` when `searchFilter` changes |
| `totalClasses` dashboard stat | RSC dashboard page | controlled prop | Extended on existing `TeacherDashboardVM` |

**Handoff note to `fe-state-engineer`:** No TanStack Query keys, no mutations, no
optimistic updates in this US. All async data flows through RSC → VM props. The only
client state is ephemeral UI state inside `TeacherRosterTable`. See `## State
Architecture` section for the full flow analysis (already completed by `fe-state-engineer`).

---

### 5. Composition and Variant Strategy

**ClassCard** is a composed leaf with no compound pattern needed — single visual form,
no slots. The GVCN badge is `<StatusBadge tone="success">GVCN</StatusBadge>` inline
(single use site, not a new shared concept). No `cva` yet — add a `variant` prop only
if a second visual form emerges.

Action button pattern in ClassCard:
- Primary: `<Link href={vm.studentsPath}>` styled with `Button` variant ghost — keyboard
  and screen-reader navigable as a link (correct semantics).
- Disabled future actions: `<button type="button" disabled aria-disabled="true">` wrapped
  in `<Tooltip>`. Radix `Tooltip` propagates the trigger's `aria-describedby` to the
  tooltip content, exposing "Sắp có" to screen readers without custom wiring.

**TeacherRosterTable** is a composed stateful component. It replicates the visual pattern
of `RosterTable` (admin) but with the mutation surface removed entirely. The pagination
sub-component (`TeacherRosterPagination`) lives as a private function in the same file.
Promote to `components/shared/` only when a third screen needs the same pagination or when
admin roster is refactored to be read-only.

**GenderBadge promotion** is the only structural shared-layer change. The promotion makes
it i18n-namespace-agnostic (caller provides labels as props). The visual implementation
(`role="img"`, 22×22 circular badge, token classes) is unchanged. A `.stories.tsx` must
be created at the new location covering Female and Male states with a11y assertions.

**Dashboard stat addition** is purely additive — one more `<StatCard>` in the existing
`auto-fit` grid. No layout variants or `cva` changes required.

---

### 6. Accessibility Contract

| Component | Required roles / labels / keyboard |
|---|---|
| `TeacherClassesScreen` class grid | `<ul role="list">` wrapping `<li>` per card. Screen title: `<h1 className="sr-only">`. |
| `ClassCard` | Card `<article>` or `<li>` with `<h2>` class name as accessible heading for the card region. "Xem học sinh" `<Link>` has visible text — no `aria-label` needed. Disabled buttons: `disabled` attribute + `aria-disabled="true"`. Tooltip trigger: Radix wires `aria-describedby` → tooltip content ("Sắp có"). All interactive elements: `min-h-[44px] min-w-[44px]` touch target. Focus ring via `focus-visible:ring-2 focus-visible:ring-ring` on every interactive child. |
| `ClassesEmptyState` | Decorative icons: `aria-hidden="true"`. Heading `<h3>` for title. No interactive elements. |
| `ClassesErrorState` | Error message in `<p>` (not color-only). Retry `<Button>` with visible label text. |
| `TeacherRosterBreadcrumb` | `<nav aria-label="breadcrumb">` wrapper. `<ol>` with `<li>` items. Separators `aria-hidden="true"`. Root crumb is a `<Link>` (keyboard-navigable). Leaf crumb: `aria-current="page"`. |
| `TeacherRosterTable` | `<table>` with `<thead>` and `<th scope="col">` per column. Search: `<label>` wrapping the `<input>` with a visible `<span className="sr-only">` for the label text. Clear button: `aria-label={labels.clearSearch}`. No checkboxes (simpler than admin table). Avatar initials: `aria-hidden="true"` (decorative); student name adjacent `<span>` is the readable name. GenderBadge: `role="img"` + caller-provided `aria-label`. StatusBadge: text content is readable. Pagination prev/next: `aria-label` from `labels.prevPage` / `labels.nextPage`. Page indicator: `aria-live="polite"` on the page-of text so screen readers announce page changes. |
| `GenderBadge` (promoted) | `role="img"` + `aria-label` (caller-provided translated string). Color is supplementary — initial letter conveys gender (color-blind safe). |
| Disabled action buttons (ClassCard) | `disabled` + `aria-disabled="true"`. `Tooltip` content announced via `aria-describedby` (Radix Tooltip wires this automatically). |
| Dashboard `StatCard` addition | Follows existing `StatCard` pattern — icon box is `aria-hidden`. Label and value are plain text. No new a11y concerns. |

**Motion:** `ClassCardSkeleton` shimmer must use `motion-safe:animate-pulse`. Verify
the `Skeleton` primitive in `components/ui/skeleton/skeleton.tsx` already gates on
`motion-safe:`; if not, the engineer must add it (or the primitive is updated at
`components/ui/skeleton/` per shadcn "you own the code").

**Focus management:** No modals or dialogs in either screen. Tab order follows DOM order:
card grid toolbar → cards → students page: breadcrumb → table toolbar → table rows → pagination.

---

### 7. Canonical Component Placement Summary

| Component | Canonical home | Rationale |
|---|---|---|
| `TeacherClassesScreen` | `features/teacher/presentation/teacher-classes/` | Single screen |
| `ClassCard` | `features/teacher/presentation/teacher-classes/components/` | Single screen — promote when 2nd screen needs it |
| `ClassCardSkeleton` | `features/teacher/presentation/teacher-classes/components/` | Paired with ClassCard |
| `ClassesEmptyState` | `features/teacher/presentation/teacher-classes/components/` | Feature-local read-only (different copy from admin) |
| `ClassesErrorState` | `features/teacher/presentation/teacher-classes/components/` | Feature-local |
| `TeacherClassStudentsScreen` | `features/teacher/presentation/teacher-class-students/` | Single screen |
| `TeacherRosterBreadcrumb` | `features/teacher/presentation/teacher-class-students/components/` | Different pattern from admin breadcrumb (static vs dropdown) — not shared |
| `TeacherRosterTable` | `features/teacher/presentation/teacher-class-students/components/` | Read-only variant — promote when admin adds read-only mode |
| `GenderBadge` | `components/shared/gender-badge/` | **PROMOTED** (second use: admin-roster + teacher-roster) |
| `StatusBadge` | `components/shared/status-badge/` (existing) | Already shared — no change |
| `StatCard` | `components/shared/stat-card/` (existing) | Already shared — no change |
| `Tooltip`, `Button`, `Avatar`, `Skeleton` | `components/ui/*/` (existing) | Primitives — no change |
