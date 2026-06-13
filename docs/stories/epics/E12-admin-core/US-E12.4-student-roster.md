# US-E12.4 Student Roster — Class Enrollment Management

## Status

implemented

## Lane

normal

## Product Contract

Admin quản lý danh sách học sinh trong từng lớp của năm học hiện tại: xem roster,
thêm học sinh vào lớp (tìm kiếm theo tên/mã), chuyển lớp (transfer), bỏ ghi danh.
Constraint quan trọng: một học sinh chỉ thuộc **một lớp** trong một năm học —
moving a student hiển thị cảnh báo chuyển lớp.

BE story: US-043 (student roster / class enrollment).

## Relevant Product Docs

- `design_src/edu/roster.jsx` — **pixel reference** (route `/admin/roster`, US-043)
- BE API (mock-first):
  - `GET    /api/v1/core/classes?yearId=`
  - `GET    /api/v1/core/classes/:classId/students`
  - `POST   /api/v1/core/classes/:classId/students` (enroll)
  - `DELETE /api/v1/core/classes/:classId/students/:studentId` (unenroll)
  - `POST   /api/v1/core/students/:studentId/transfer` `{ fromClassId, toClassId }`

## Acceptance Criteria

- Route `app/[locale]/t/[tenant]/(app)/admin/roster/page.tsx`.
- Class selector (pill tabs) + student list table.
  - Columns: STT, mã HS, họ tên, ngày sinh, giới tính, trạng thái.
  - Status `transferred`: muted + strikethrough.
- "Thêm học sinh" side panel: search input → result list → click enroll.
  - Warning banner nếu student đã enrolled ở lớp khác.
- Transfer: confirm dialog với from/to class info.
- Empty state cho lớp mới tạo chưa có học sinh.
- Mock-first (DI); vitest unit cho transfer-warning logic.
- Design review pass.

## Design Notes

- Design file: `design_src/edu/roster.jsx`.
- 32 học sinh seed trong lớp 10A1, 2 đã `transferred` (minh họa muted state).
- Table: sortable by name / mã; search highlight.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | transfer-warning (student already enrolled); unenroll confirmation |
| Integration | enroll → list updates; transfer warning surfaced |
| E2E | — |
| Platform | `bun build` xanh |
| Release | design-review gate pass |

## Role Guard

Route `/admin/roster` — chỉ role `admin` (decision `0022`).

## Harness Delta

Decision 0028: gender indicator tokens (--edu-gender-female/male + light variants).
Decision 0029: AA-compliant gender text tokens (--edu-gender-female-text / --edu-gender-male-text).

## Evidence

Design review: pass
- design-system: conform (tokens-only, no raw hex, StatusBadge reused, typography/spacing/radius from tokens.css)
- a11y: WCAG AA pass after fixes — A11Y-001 (warning button foreground), A11Y-002 (success text token), A11Y-003 (gender AA text tokens decision 0029), A11Y-004 (muted→secondary on table headers/content), A11Y-008 (search focus rings), A11Y-009 (clear button aria-label), A11Y-010 (th scope="col"); A11Y-011 (pagination nav label); motion-safe transitions; touch targets ≥44px on remove/action buttons; Radix dialog/dropdown keyboard semantics intact; status not by color alone
- impeccable audit: skipped (/impeccable init deferred per rule impeccable.md + no PRODUCT.md); design system is source of truth
- states: loading (RosterSkeleton/Suspense), empty (RosterEmptyState — 0 students), error (toast via sonner), success (populated table + AddPanel), transfer-warning, bulk-selected — all 6 Storybook stories; responsive grid with minmax()

---

## Implementation Plan

### Summary

Screen `/admin/roster` — admin manages class enrollment for current academic year.
Mock-first (BE `core` service absent). Two-column layout: RosterTable (60%) + AddStudentPanel (40%), ClassInfoCard header, class-selector breadcrumb dropdown. Transfer-warning domain logic is the core business invariant.

Done when: all 5 phases green + design-review gate pass.

Key decisions:
- Mock-first via `NEXT_PUBLIC_USE_MOCK` + `bootstrap/lib/mock.ts` (decision `0014`) — same pattern as `admin-school-setup`.
- `core` service not live → `MockRosterRepository` holds in-memory state; `RosterRepository` wires real HTTP (decision `0017`).
- No new design tokens required — `--edu-primary`, `--edu-success`, `--edu-warning`, `--edu-error`, `--edu-text-muted`, `--edu-border`, `--edu-bg`, `--edu-card`, `shadow-card` all exist in `tokens.css`. Gender badge uses raw hex in design (`#FFE6F1`/`#E6F0FF`) — no semantic token mapping exists. **Flag to `fe-lead` for ADR (next = 0027+, check current highest).**
- `StatCard` + `StatusBadge` already in `components/shared/` — reuse. No new shared components needed (ClassInfoCard is roster-specific, lives in `features/admin-roster/presentation/`).
- `Avatar` primitive exists in `components/ui/avatar/` — reuse.
- Checkbox, Pagination, Dialog primitives exist in `components/ui/` — reuse.
- Bulk-unenroll triggers a confirm `Dialog` (destructive); single unenroll uses same dialog. Transfer triggers a separate confirm dialog (warning tone) showing from/to class.
- `AddStudentPanel` search is local-filter over a loaded pool (max 25 shown) — no debounced API call needed in mock phase; real repo can paginate the pool endpoint.
- Page-level state: `currentClassId` in URL search param (`?classId=`) so deep-link works + RSC can pre-fetch; local checkbox selection and search query are local form state (no Zustand).

---

### Phase 1 — Domain + contract

**Goal:** pure TypeScript layer; zero framework/HTTP deps; transfer-warning invariant unit-tested.

**Files:**
```
features/admin-roster/domain/
  entities/class-summary.entity.ts      — ClassSummary { id, name, gradeLevel, homeroomTeacher, year }
  entities/roster-student.entity.ts     — RosterStudent { id, name, dob, gender, status: 'active'|'transferred' }
  entities/search-student.entity.ts     — SearchStudent { id, name, currentClassId, currentClassName }
  failures/roster.failure.ts            — RosterFailure union: network-error | unauthorized | not-found | unknown
  repositories/i-roster.repository.ts   — IAccountRosterRepository interface (all 5 methods)
  use-cases/get-classes.use-case.ts
  use-cases/get-roster.use-case.ts
  use-cases/enroll-student.use-case.ts  — returns transfer-warning flag when student has currentClassId
  use-cases/unenroll-student.use-case.ts
  use-cases/transfer-student.use-case.ts
```

**Test first (Vitest unit):**
- `enroll-student.use-case.test.ts` — given mock i-repo:
  - enroll unassigned student → ok, no transfer warning
  - enroll student already in another class → ok + `transferWarning: { fromClassName }` in result
  - repo returns network-error → failure propagated
- `unenroll-student.use-case.test.ts`:
  - unenroll existing active student → ok
  - unenroll non-existent id → `not-found` failure

**Done when:** unit tests green, `bun vitest run` passes.

---

### Phase 2 — Infrastructure (server-only) + bootstrap wiring

**Goal:** HTTP boundary wired; envelope unwrap; mock-first toggle; endpoint constants.

**Files:**
```
bootstrap/endpoint/admin-roster.endpoint.ts
  ROSTER_EP = {
    classes:        '/core/classes',
    classStudents:  '/core/classes/:classId/students',
    enroll:         '/core/classes/:classId/students',
    unenroll:       '/core/classes/:classId/students/:studentId',
    transfer:       '/core/students/:studentId/transfer',
    searchPool:     '/core/students/unassigned',   // returns candidates for AddStudentPanel
  }

features/admin-roster/infrastructure/
  dtos/classes-response.dto.ts            — ClassDto { id, name, gradeLevel, homeroomTeacher, year }
  dtos/roster-response.dto.ts             — RosterStudentDto { id, name, dob, gender, status }
  dtos/search-students-response.dto.ts    — SearchStudentDto { id, name, currentClassId, currentClassName }
  mappers/roster.mapper.ts                — toClassSummary(), toRosterStudent(), toSearchStudent()
  repositories/roster.repository.ts      — implements IAccountRosterRepository; 'server-only'
  repositories/mock-roster.repository.ts — in-memory state seeded from design_src mock data; 'server-only'

bootstrap/di/admin-roster.di.ts          — makeRosterRepository(): USE_MOCK → Mock else Real; 'server-only'
```

**Test first (integration):**
- `roster.mapper.test.ts` — DTO→entity mapping: camelCase field pass-through, `status` union guard.
- `roster.repository.test.ts` (mock HTTP via `vi.mock` on http client) — envelope unwrap for list endpoint; error code → `RosterFailure` mapping (`USER_NOT_FOUND` → `not-found`, 401 → `unauthorized`).

**Done when:** mapper + repository integration tests green; `USE_MOCK=true` DI returns `MockRosterRepository`.

---

### Phase 3 — Presentation: ViewModel + i18n keys

**Goal:** define the ViewModel interface contract (server↔client boundary); add all i18n keys before any JSX.

**Files:**
```
features/admin-roster/presentation/student-roster-screen/
  student-roster-screen.i-vm.ts   — StudentRosterVM {
                                      classes: ClassSummary[];
                                      currentClass: ClassSummary;
                                      roster: RosterStudent[];
                                      activeCount: number;
                                      transferredCount: number;
                                      searchPool: SearchStudent[];
                                    }
bootstrap/i18n/messages/vi.json   — add "adminRoster" namespace (see key list below)
bootstrap/i18n/messages/en.json   — mirror
```

**i18n key plan (namespace `adminRoster`):**
```
adminRoster.title                    Danh sách học sinh
adminRoster.subtitle                 Quản lý ghi danh học sinh...
adminRoster.breadcrumb.classes       Lớp học
adminRoster.breadcrumb.roster        Danh sách học sinh
adminRoster.classInfo.homeroom       GVCN
adminRoster.classInfo.unassigned     Chưa phân công
adminRoster.classInfo.grade          Khối {level}
adminRoster.classInfo.active         Đang học
adminRoster.classInfo.transferred    Đã chuyển
adminRoster.table.name               Họ và tên
adminRoster.table.studentId          Mã học sinh
adminRoster.table.dob                Ngày sinh
adminRoster.table.gender             Giới tính
adminRoster.table.status             Trạng thái
adminRoster.table.searchPlaceholder  Tìm theo tên hoặc mã học sinh...
adminRoster.table.noMatch            Không tìm thấy học sinh nào khớp.
adminRoster.table.exportCsv          Xuất CSV
adminRoster.table.removeFromClass    Xoá khỏi lớp
adminRoster.table.selected           Đã chọn {count} học sinh
adminRoster.table.clearSelection     Bỏ chọn
adminRoster.table.showing            Hiển thị {from}–{to} / {total} học sinh
adminRoster.status.active            Đang học
adminRoster.status.transferred       Đã chuyển lớp
adminRoster.addPanel.title           Thêm học sinh
adminRoster.addPanel.subtitle        Tìm và thêm học sinh vào lớp này.
adminRoster.addPanel.searchPlaceholder  Tên hoặc mã học sinh...
adminRoster.addPanel.noResults       Không tìm thấy học sinh.
adminRoster.addPanel.inClass         Đã trong lớp
adminRoster.addPanel.add             Thêm vào lớp
adminRoster.addPanel.transfer        Chuyển lớp
adminRoster.addPanel.unassigned      Chưa thuộc lớp nào
adminRoster.addPanel.transferWarning Học sinh đang trong lớp {className} — thêm vào lớp này sẽ chuyển lớp.
adminRoster.addPanel.importCsv       Import từ CSV
adminRoster.empty.title              Lớp chưa có học sinh
adminRoster.empty.body               Hãy thêm học sinh để bắt đầu nhập điểm và điểm danh cho lớp này.
adminRoster.empty.addFirst           Thêm học sinh đầu tiên cho lớp này
adminRoster.empty.importCsv          Import từ CSV
adminRoster.actions.importCsv        Import CSV
adminRoster.actions.exportList       Xuất danh sách
adminRoster.confirm.unenrollTitle    Xoá khỏi lớp?
adminRoster.confirm.unenrollBody     {count} học sinh sẽ bị xoá khỏi lớp này. Không thể hoàn tác.
adminRoster.confirm.transferTitle    Xác nhận chuyển lớp
adminRoster.confirm.transferBody     {name} sẽ được chuyển từ lớp {fromClass} sang lớp này.
adminRoster.confirm.cancel           Hủy
adminRoster.confirm.confirm          Xác nhận
adminRoster.errors.network-error     Không thể kết nối đến máy chủ
adminRoster.errors.unauthorized      Bạn không có quyền truy cập
adminRoster.errors.not-found         Không tìm thấy dữ liệu
adminRoster.errors.unknown           Có lỗi xảy ra, vui lòng thử lại
```

**Test first:** `bunx tsc --noEmit` catches missing/mismatched keys.

**Done when:** type-check passes, i18n namespace present in both locale files.

---

### Phase 4 — Presentation: Client Component + RSC page + Server Actions

**Goal:** full UI wired; mock data renders; all interactive states (loading skeleton, empty, error toast, transfer confirm dialog) covered by Storybook interactions.

**Files:**
```
features/admin-roster/presentation/student-roster-screen/
  student-roster-screen.tsx         — 'use client'; receives VM props + action props
  components/
    roster-breadcrumb.tsx           — class dropdown pill; Radix DropdownMenu primitive
    class-info-card.tsx             — ClassInfoCard; feature-local (not shared — single screen)
    roster-table.tsx                — table + search + checkbox + pagination + bulk bar
    add-student-panel.tsx           — search input + scrollable result list + transfer warning
    roster-empty-state.tsx          — empty state with icon illustration
    unenroll-confirm-dialog.tsx     — AlertDialog (destructive); single + bulk
    transfer-confirm-dialog.tsx     — Dialog (warning tone)
  student-roster-screen.stories.tsx — states: loading | empty | populated | error

app/[locale]/t/[tenant]/(app)/admin/roster/
  page.tsx                          — RSC; reads ?classId param; calls makeRosterRepository(); passes VM + actions to StudentRosterScreen
  actions.ts                        — 'use server'; enrollAction, unenrollAction, unenrollManyAction, transferAction; each calls makeRosterRepository() + use-case; returns { ok, errorKey? }
```

**Layout notes (from design reference):**
- Page max-width 1280px, padding `px-8 py-6`, gap-18 between sections.
- Two-column grid: `grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]` gap-18 — left 60% RosterTable, right 40% AddStudentPanel (sticky top-0 on scroll).
- Empty state: left column shows `RosterEmptyState`, right column still shows `AddStudentPanel`.
- ClassInfoCard: flex row, icon box 56×56 radius-[14px] `bg-edu-primary/10`, stat mini-cards (success toned for active, muted for transferred — show only if >0).
- Gender badge: `F` = pink bg/text, `M` = blue bg/text. **No semantic token exists for these colors** — see flag in Summary; until ADR resolved, use closest available or inline CSS variable.
- `currentClassId` URL param drives RSC pre-fetch; default = first class in list.

**Storybook stories (interaction tests):**
- `Loading` — skeleton state (Suspense boundary fallback)
- `EmptyClass` — cls-10b3, 0 students; empty state + AddPanel
- `Populated` — cls-10a1, 32 students, 2 transferred; page 1
- `TransferWarning` — AddPanel with student already in cls-10a2 shown
- `BulkSelected` — 3 students checked, bulk action bar visible
- `ErrorState` — network-error toast

**Done when:** Storybook interactions green; `bun build` passes; design-review gate submitted.

---

### Phase 5 — TDD proof + TEST_MATRIX update

**Goal:** all acceptance criteria have a named proof; TEST_MATRIX row updated to `implemented`.

**Proofs to verify exist:**
| Behaviour | Proof file | Type |
|---|---|---|
| Transfer-warning returned when student has currentClassId | `enroll-student.use-case.test.ts` | Unit |
| Unenroll propagates not-found failure | `unenroll-student.use-case.test.ts` | Unit |
| DTO→entity mapping camelCase correct | `roster.mapper.test.ts` | Integration |
| Envelope unwrap + error→failure mapping | `roster.repository.test.ts` | Integration |
| Empty class renders empty state, not table | `student-roster-screen.stories.tsx` (EmptyClass interaction) | Storybook |
| Transfer confirm dialog shown on "Chuyển lớp" click | `student-roster-screen.stories.tsx` (TransferWarning interaction) | Storybook |
| Bulk unenroll confirm dialog shown on ≥1 selected | `student-roster-screen.stories.tsx` (BulkSelected interaction) | Storybook |
| `bun build` xanh | CI pre-push gate | Platform |

**Done when:** `docs/TEST_MATRIX.md` row US-E12.4 → `implemented`; all proofs runnable.

---

### Component + State Sketch

**State classification:**
- `currentClassId` — URL search param (`?classId=`); drives RSC data fetch. Default = first class id.
- `roster`, `classes`, `searchPool` — server state; RSC pre-fetches and passes as props; mutations via Server Actions + router.refresh().
- `search` (table), `panelQuery` (add panel) — local form state (`useState`); no TanStack Query needed (mock-first, data in props).
- `selected` (checkbox set), `page` — local form state in `RosterTable`.
- `confirmDialog` (unenroll/transfer open state + target ids) — local form state in `StudentRosterScreen`.

No `fe-state-engineer` needed — state is simple server+local; no TanStack Query client caching in mock phase.

**Component tree (abbreviated):**
```
StudentRosterScreen (client)
├── RosterBreadcrumb           — DropdownMenu wrapping class list
├── ClassInfoCard              — feature-local, feature/admin-roster/presentation/…
├── [empty? RosterEmptyState : RosterTable]
│   ├── search input + clear button
│   ├── bulk action bar (conditional)
│   ├── <table> rows with Avatar + StatusBadge
│   └── RosterPagination
├── AddStudentPanel            — feature-local
│   ├── search input
│   └── result rows (Avatar + transfer-warning banner + Thêm/Chuyển button)
├── UnenrollConfirmDialog      — AlertDialog primitive
└── TransferConfirmDialog      — Dialog primitive
```

`fe-component-architect` not required — no net-new shared components; all composed components are feature-local (single screen). Avatar, Badge, Dialog, AlertDialog, Checkbox, Pagination primitives reused from `components/ui/`.

---

### Risks, Dependencies, Open Questions

**Risks:**
1. Gender badge colors (`#FFE6F1`/`E6F0FF`) have no semantic token in `tokens.css` — raw hex would violate design-system rule. **Action: flag to `fe-lead` → ADR for `--edu-gender-female-bg`/`--edu-gender-male-bg` tokens before Phase 4 JSX.**
2. `searchPool` endpoint (`/core/students/unassigned`) is inferred from design intent — not explicitly listed in the AC endpoint table. If BE story US-043 uses a different path, the endpoint constant must be corrected before real wiring.
3. Transfer confirm in design fires immediately on "Chuyển lớp" button click — no intermediate "are you sure" in the mock JSX. AC says "confirm dialog with from/to class info" — plan includes `TransferConfirmDialog`; verify with PO if single-click or two-step is required.
4. CSV import (footer button in AddPanel, page-level button) is visible in design but not in AC scope for US-E12.4 — plan renders button as disabled/stub only to match pixel spec. Actual import = separate US.
5. `?classId=` URL param approach assumes the RSC page can fall back gracefully if param is missing or invalid (default = first class). If school has 0 classes, show a redirect/empty-classes state — plan `RosterEmptyState` variant "no classes configured yet" may be needed.

**[OPEN QUESTION]** Is `GET /core/students/unassigned` the correct search-pool endpoint, or does it differ in US-043 BE contract? Confirm with BE before Phase 2.

**[OPEN QUESTION]** Confirm: CSV import is out of scope for US-E12.4 (separate story)? If yes, button is disabled stub only.

---

## Component Architecture

> Authored by `fe-component-architect`. All placement decisions follow decision `0026` (canonical home).
> Gender token decision `0028` is already resolved — `--edu-gender-female` / `--edu-gender-female-light` /
> `--edu-gender-male` / `--edu-gender-male-light` are present in `src/app/tokens.css`.

---

### 1. Architecture Summary

**Feature scope:** `src/features/admin-roster/presentation/student-roster-screen/`

**New components (feature-local — single screen, no shared placement needed):**

| Component | Path (relative to presentation/) |
|---|---|
| `StudentRosterScreen` | `student-roster-screen/student-roster-screen.tsx` |
| `RosterBreadcrumb` | `student-roster-screen/components/roster-breadcrumb.tsx` |
| `ClassInfoCard` | `student-roster-screen/components/class-info-card.tsx` |
| `RosterTable` | `student-roster-screen/components/roster-table.tsx` |
| `RosterPagination` | `student-roster-screen/components/roster-pagination.tsx` (sub of RosterTable) |
| `GenderBadge` | `student-roster-screen/components/gender-badge.tsx` (sub of RosterTable rows) |
| `AddStudentPanel` | `student-roster-screen/components/add-student-panel.tsx` |
| `RosterEmptyState` | `student-roster-screen/components/roster-empty-state.tsx` |
| `UnenrollConfirmDialog` | `student-roster-screen/components/unenroll-confirm-dialog.tsx` |
| `TransferConfirmDialog` | `student-roster-screen/components/transfer-confirm-dialog.tsx` |

**Reused — no new component created:**

| Existing component | Location | Used in |
|---|---|---|
| `StatusBadge` | `components/shared/status-badge/` | `RosterTable` rows (active/transferred status column) |
| `Avatar` + `AvatarFallback` | `components/ui/avatar/` | `RosterTable` rows, `AddStudentPanel` result rows |
| `Checkbox` | `components/ui/checkbox/` | `RosterTable` header + row select |
| `DropdownMenu` | `components/ui/dropdown-menu/` | `RosterBreadcrumb` class selector |
| `AlertDialog` | `components/ui/alert-dialog/` | `UnenrollConfirmDialog` (destructive pattern) |
| `Dialog` | `components/ui/dialog/` | `TransferConfirmDialog` (warning tone) |
| `ScrollArea` | `components/ui/scroll-area/` | `AddStudentPanel` results list |
| `Input` | `components/ui/input/` | Search field in `RosterTable` toolbar + `AddStudentPanel` |
| `Button` | `components/ui/button/` | Action buttons throughout |
| `Skeleton` | `components/ui/skeleton/` | Loading state fallback |

**Missing shadcn primitives — none needed.** All required primitives are already present in `components/ui/`.

**No new design tokens needed.** Gender tokens (`--edu-gender-female`, `--edu-gender-female-light`, `--edu-gender-male`, `--edu-gender-male-light`) are confirmed present in `src/app/tokens.css` (decision `0028`). All other tokens (`--edu-success`, `--edu-warning`, `--edu-error`, `--edu-text-primary`, etc.) already exist.

**`StatCard` not used** — `ClassInfoCard` is a custom layout combining class metadata with mini stat counters specific to this screen. It does not match the `StatCard` icon-value pattern. Feature-local placement is correct.

---

### 2. Component Tree

```
app/[locale]/t/[tenant]/(app)/admin/roster/page.tsx   [RSC — reads ?classId param, fetches VM, passes to screen]
└── StudentRosterScreen                                 ['use client' — orchestrates all local state]
    ├── RosterBreadcrumb                                [presentational — DropdownMenu trigger/items]
    ├── ClassInfoCard                                   [presentational — pure props display]
    │   ├── Avatar + AvatarFallback (ui/)              [presentational]
    │   ├── StatusBadge (shared/)  × grade/year badges [presentational]
    │   └── mini-stat counters (inline divs)           [presentational]
    │
    ├── [roster.length === 0]
    │   └── RosterEmptyState                           [presentational — no local state]
    │
    ├── [roster.length > 0]
    │   └── RosterTable                                ['use client' — owns search/selected/page local state]
    │       ├── Input (ui/) — search field             [controlled by RosterTable]
    │       ├── Button (ui/) — Export CSV (disabled stub)
    │       ├── [selected.size > 0] BulkActionBar      [inline fragment — no separate component]
    │       │   ├── count label
    │       │   ├── Button "Bỏ chọn"
    │       │   └── Button "Xoá khỏi lớp" → calls onRequestUnenrollMany
    │       ├── <table>
    │       │   ├── <thead> with Checkbox (ui/) header [indeterminate state managed by RosterTable]
    │       │   └── <tbody> rows
    │       │       ├── Checkbox (ui/)                 [controlled by RosterTable selected Set]
    │       │       ├── Avatar + AvatarFallback (ui/)
    │       │       ├── GenderBadge                    [presentational — 'F'|'M' → token classes]
    │       │       ├── StatusBadge (shared/)          [tone="success" or tone="muted"]
    │       │       └── remove icon Button             → calls onRequestUnenrollOne
    │       └── RosterPagination                       [presentational — page/totalPages props + setPage callback]
    │
    ├── AddStudentPanel                                ['use client' — owns panelQuery + recentlyAdded local state]
    │   ├── Input (ui/) — search field                [controlled by AddStudentPanel]
    │   ├── ScrollArea (ui/) — results list
    │   │   └── result rows (map)
    │   │       ├── Avatar + AvatarFallback (ui/)
    │   │       ├── [conflictClass] TransferWarningBanner [inline fragment]
    │   │       ├── [unassigned] StatusBadge tone="muted" "Chưa thuộc lớp nào"
    │   │       ├── [alreadyEnrolled] "Đã trong lớp" Button disabled
    │   │       └── [available] "Thêm vào lớp" / "Chuyển lớp" Button → calls onRequestEnroll
    │   └── CSV Import footer Button (disabled stub)
    │
    ├── UnenrollConfirmDialog                          [presentational — open/targets via props]
    │   └── AlertDialog (ui/) — destructive variant
    │
    └── TransferConfirmDialog                          [presentational — open/student via props]
        └── Dialog (ui/) — warning tone
```

**Annotation key:**
- `[RSC]` — React Server Component; no `'use client'`; may call `makeRosterRepository()` and `use-cases`.
- `['use client']` — client component; receives VM and/or action props; may own local UI state.
- `[presentational]` — stateless; renders props only; no `useState`/`useEffect`.

---

### 3. ViewModel + Prop Interfaces

#### `student-roster-screen.i-vm.ts`

```typescript
// features/admin-roster/presentation/student-roster-screen/student-roster-screen.i-vm.ts

import type { ClassSummary } from "@/features/admin-roster/domain/entities/class-summary.entity";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import type { SearchStudent } from "@/features/admin-roster/domain/entities/search-student.entity";

/**
 * ViewModel — server↔client contract.
 * RSC page.tsx maps use-case output into this shape and passes it as props
 * to StudentRosterScreen. No infrastructure types may cross this boundary.
 */
export interface StudentRosterScreenVm {
  /** All classes for the current academic year (drives RosterBreadcrumb). */
  classes: ClassSummary[];
  /** The currently selected class (default = first in classes). */
  currentClass: ClassSummary;
  /** Enrolled students for currentClass. Includes transferred entries. */
  roster: RosterStudent[];
  /** Derived: roster.filter(s => s.status === 'active').length */
  activeCount: number;
  /** Derived: roster.filter(s => s.status === 'transferred').length */
  transferredCount: number;
  /**
   * Candidate pool for AddStudentPanel — students NOT in currentClass.
   * Students with currentClassId !== null have a transfer warning.
   * Max 25 shown client-side after local filter.
   */
  searchPool: SearchStudent[];
}

/**
 * Action result — same shape across all Server Actions so the client
 * component can handle errors uniformly.
 */
export interface RosterActionResult {
  ok: boolean;
  /** Matches a key in adminRoster.errors namespace. Present when ok=false. */
  errorKey?: string;
}

/**
 * Props for StudentRosterScreen — the main 'use client' component.
 * All mutations go through Server Action refs; no direct DI or HTTP.
 */
export interface StudentRosterScreenProps {
  vm: StudentRosterScreenVm;
  /** Enroll a single student (also handles transfer if student has currentClassId). */
  onEnroll: (studentId: string) => Promise<RosterActionResult>;
  /** Remove a single student from the class. */
  onUnenroll: (studentId: string) => Promise<RosterActionResult>;
  /** Bulk remove selected students. */
  onUnenrollMany: (studentIds: string[]) => Promise<RosterActionResult>;
  /** Transfer a student from their current class to currentClass. */
  onTransfer: (studentId: string, fromClassId: string) => Promise<RosterActionResult>;
}
```

#### Sub-component prop interfaces

```typescript
// ── RosterBreadcrumb ─────────────────────────────────────────────────────────
// Rendered inside StudentRosterScreen. Owns DropdownMenu open state internally.

interface RosterBreadcrumbProps {
  classList: ClassSummary[];
  currentClassId: string;
  /** Called when user selects a different class; triggers router.push(?classId=). */
  onClassChange: (classId: string) => void;
}

// ── ClassInfoCard ─────────────────────────────────────────────────────────────
// Purely presentational. Feature-local.

interface ClassInfoCardProps {
  cls: ClassSummary;
  activeCount: number;
  transferredCount: number;
}

// ── RosterTable ───────────────────────────────────────────────────────────────
// 'use client'. Owns: search (string), selected (Set<string>), page (number).
// Lifts mutation events up — never calls Server Actions directly.

interface RosterTableProps {
  roster: RosterStudent[];
  /** Called when user clicks single-row remove icon. Parent opens UnenrollConfirmDialog. */
  onRequestUnenrollOne: (studentId: string) => void;
  /** Called when user clicks "Xoá khỏi lớp" in bulk bar. Parent opens UnenrollConfirmDialog. */
  onRequestUnenrollMany: (studentIds: string[]) => void;
}

// ── RosterPagination ──────────────────────────────────────────────────────────
// Purely presentational — no state. RosterTable owns page number.

interface RosterPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  /** Count of rows on current page (to compute the "showing X–Y" label). */
  pageRowCount: number;
  onPageChange: (page: number) => void;
}

// ── GenderBadge ───────────────────────────────────────────────────────────────
// Purely presentational. Renders circular badge with gender token classes.
// decision 0028: bg-edu-gender-female-light text-edu-gender-female  (F)
//                bg-edu-gender-male-light   text-edu-gender-male    (M)

interface GenderBadgeProps {
  gender: "F" | "M";
}

// ── AddStudentPanel ───────────────────────────────────────────────────────────
// 'use client'. Owns: panelQuery (string), recentlyAdded (Set<string>).
// Sticky right column. Receives full searchPool; filters client-side up to 25.

interface AddStudentPanelProps {
  searchPool: SearchStudent[];
  /** Set of ids already in the roster — used to disable "already enrolled" rows. */
  enrolledIds: ReadonlySet<string>;
  /**
   * Called on "Thêm vào lớp" or "Chuyển lớp" button click.
   * Parent (StudentRosterScreen) decides whether to open TransferConfirmDialog
   * (when student.currentClassId !== null) or call onEnroll directly.
   */
  onRequestEnroll: (student: SearchStudent) => void;
}

// ── RosterEmptyState ──────────────────────────────────────────────────────────
// Purely presentational. No local state.

interface RosterEmptyStateProps {
  /** Focuses AddStudentPanel search input (passed as ref callback from parent). */
  onAddFirstClick: () => void;
}

// ── UnenrollConfirmDialog ─────────────────────────────────────────────────────
// Presentational-controlled. Open state + targets owned by StudentRosterScreen.
// Uses AlertDialog (destructive) from ui/.

interface UnenrollConfirmDialogProps {
  open: boolean;
  /** Student ids to remove. Length drives the body copy (singular vs plural). */
  targetIds: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

// ── TransferConfirmDialog ─────────────────────────────────────────────────────
// Presentational-controlled. Warning tone. Uses Dialog from ui/.

interface TransferConfirmDialogProps {
  open: boolean;
  /** Student being transferred. */
  student: SearchStudent | null;
  /** Name of the destination class (currentClass.name). */
  toClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

### 4. State Ownership (contract level)

| State | Owner | Type | Notes |
|---|---|---|---|
| `currentClassId` | URL `?classId=` param | routing | RSC reads → default = first class. Client changes via `router.push`. |
| `roster`, `classes`, `searchPool` | RSC page props | server state | Passed into VM; mutations call Server Actions + `router.refresh()`. |
| `search` | `RosterTable` | `useState<string>` | Local filter; resets on `roster` prop change (`useEffect`). |
| `selected` | `RosterTable` | `useState<Set<string>>` | Reset on roster change and after successful unenroll. |
| `page` | `RosterTable` | `useState<number>` | Reset to 1 on roster/filter change. |
| `panelQuery` | `AddStudentPanel` | `useState<string>` | Local filter over `searchPool` prop. |
| `recentlyAdded` | `AddStudentPanel` | `useState<Set<string>>` | Optimistic "Đã trong lớp" state before server refresh. Reset when `enrolledIds` prop changes. |
| `confirmDialog` | `StudentRosterScreen` | `useState<{ type: 'unenroll'\|'transfer'; ... } \| null>` | Drives open state + targets for both confirm dialogs. |

**Hand-off note to `fe-state-engineer`:** No TanStack Query is needed in mock-first phase — data lives in RSC props and mutations route through Server Actions + `router.refresh()`. If/when the `core` service goes live, the add-panel search pool (`GET /core/students/unassigned`) could benefit from a debounced query; that upgrade is deferred. No Zustand/global store.

---

### 5. Composition & Variant Strategy

**`StatusBadge` reuse (shared/):**
- Enrolled students in active status → `<StatusBadge tone="success">Đang học</StatusBadge>`
- Transferred students → `<StatusBadge tone="muted">Đã chuyển lớp</StatusBadge>`
- "Chưa thuộc lớp nào" label in AddPanel → `<StatusBadge tone="muted">…</StatusBadge>`
- Grade level and year mini-badges in `ClassInfoCard` → `<StatusBadge tone="primary">` and `<StatusBadge tone="muted">` respectively.

**`GenderBadge` — feature-local, not promoted to shared:**
Gender indicator (circular badge, 22×22px, initials `F`/`M`) is specific to student-roster screens. One screen uses it. Canonical home: `features/admin-roster/presentation/student-roster-screen/components/gender-badge.tsx`. Promote to `components/shared/` when a second screen needs it.

Token usage (decision `0028`):
- `F`: `className="bg-edu-gender-female-light text-edu-gender-female"`
- `M`: `className="bg-edu-gender-male-light text-edu-gender-male"`

**`ClassInfoCard` stat counters — NOT `StatCard`:**
Design shows two mini-count boxes (active: success-toned; transferred: muted-toned) within a flex row alongside class name/homeroom. This is structurally different from `StatCard` (icon-left, value-center pattern). Inline `div` composition inside `ClassInfoCard` is correct. No `StatCard` variant needed.

**`RosterBreadcrumb` — DropdownMenu pattern:**
Uses `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem` from `components/ui/dropdown-menu/`. The trigger button renders the current class name + `ChevronDown` icon. Each item shows a grid icon, class name, and grade level. Active item gets `bg-primary/12 text-primary font-bold` (Sidebar active-item token pattern from design-system.md).

**Dialog composition:**
- `UnenrollConfirmDialog` wraps `AlertDialog` (destructive). Body copy interpolates count from `targetIds.length`. Confirm button: `variant="destructive"`.
- `TransferConfirmDialog` wraps `Dialog`. Warning tone — uses `--edu-warning-light` background on the info banner inside the body. Confirm button: `variant="default"` (primary-toned).

**`AddStudentPanel` sticky behavior:**
`position: sticky; top: 0` via Tailwind `sticky top-0`. Height is `h-fit` (not full-height column). Results list uses `ScrollArea` (Radix) capped at `max-h-[460px]` to prevent panel overflow.

**`RosterTable` pagination — feature-local:**
`RosterPagination` is a sub-component of `RosterTable`. It is not the shadcn `Pagination` primitive (that component is for page-level navigation; the design uses a compact inline number row with ellipsis). Keep `RosterPagination` feature-local. The shadcn `Pagination` in `components/ui/pagination/` is not used here.

**No `cva` required** at this stage — no multi-variant component is being created. If `GenderBadge` is ever promoted to shared and gains size variants, introduce `cva` at that point.

---

### 6. Accessibility Contract

| Component / Node | Required role / label | Keyboard |
|---|---|---|
| `RosterBreadcrumb` DropdownMenu trigger | `aria-haspopup="menu"` (Radix handles); button text = class name (visible) | `Enter`/`Space` opens; `Esc` closes; arrow keys navigate items |
| `RosterTable` header checkbox | `aria-label={t('adminRoster.table.selectAll')}` (add key to i18n); `indeterminate` state set via ref | `Space` toggles |
| Each row checkbox | `aria-label={t('adminRoster.table.selectStudent', { name })}` | `Space` toggles |
| Row remove button | `aria-label={t('adminRoster.table.removeFromClass')} + ` — {student.name}`` (unique per row) | `Enter`/`Space` |
| `GenderBadge` | `aria-label={gender === 'F' ? t('adminRoster.table.genderFemale') : t('adminRoster.table.genderMale')}` (add keys) | n/a (decorative badge) |
| `RosterPagination` prev/next buttons | `aria-label="Trang trước"` / `aria-label="Trang sau"`; disabled when at boundary | `Tab` / `Enter` |
| `RosterPagination` page buttons | `aria-current="page"` on active page button | `Tab` / `Enter` |
| `UnenrollConfirmDialog` (AlertDialog) | Radix AlertDialog provides `role="alertdialog"`, focus trap, `aria-labelledby`/`aria-describedby` automatically | `Esc` cancels; `Tab` cycles buttons |
| `TransferConfirmDialog` (Dialog) | Radix Dialog provides `role="dialog"`, focus trap, `aria-labelledby`/`aria-describedby` automatically | `Esc` cancels; `Tab` cycles buttons |
| `AddStudentPanel` search input | `<label htmlFor>` linked (or `aria-label` if label is visually hidden); `role="search"` on the search wrapper | Standard input |
| Add/Transfer buttons in panel | Text label is visible (no icon-only buttons) | `Enter`/`Space` |
| Import CSV footer button | Text label visible | `Enter`/`Space`; `disabled` while out of scope — add `aria-disabled="true"` |
| Transferred row name | `text-decoration: line-through` alone is not a11y-sufficient; `StatusBadge tone="muted"` in the status column already communicates the state in text | n/a |
| `RosterEmptyState` | Not interactive except two buttons; buttons have visible text; no icon-only elements | `Tab` to reach buttons |
| Bulk action "Xoá khỏi lớp" button | Visible text; color change on hover is supplemented by border/cursor change (not color alone) | `Enter`/`Space` |

**Touch targets:** All buttons must be `min-h-[44px]` (WCAG 2.5.5). The 28×28px icon-only remove button in the table row must use `min-h-[44px] min-w-[44px]` with padding so the visual appearance stays compact but the hit area meets the threshold.

**Motion:** No animation is defined in this design beyond the sticky panel. If hover transitions (`transition-all`) are added, gate them behind `motion-safe:` Tailwind variant.

**Color-only:** Gender is communicated by both color class AND text initial (`F`/`M`) with `aria-label`. Status is communicated by `StatusBadge` text + tone (not color alone).

---

## State Architecture

_Authored by `fe-state-engineer`. Supersedes the "Component + State Sketch" section above._

---

### 1. Architecture Summary

This screen is **server-state-driven with no client cache layer**. The `core` BE service is absent in mock phase; data lives in `MockRosterRepository` (in-memory mutable state). Architecture decisions:

- RSC `page.tsx` fetches `classes` + initial `roster` + `searchPool` via DI, maps to `StudentRosterScreenVm`, and passes it as props to `StudentRosterScreen`. Same pattern as `admin-school-setup`.
- All writes route through **Server Actions** (`actions.ts`). After each successful mutation, the client calls `router.refresh()` to re-execute the RSC, which re-reads the (now-mutated) in-memory mock and re-renders with fresh data.
- **No TanStack Query** introduced in this story. Rationale — see §4 below.
- **No global client store.** All local ephemeral UI state lives in `useState` scoped to the component subtree. Aligns with this repo's architecture: no Zustand/Redux/Jotai.

**Why Server Actions + `router.refresh()` over TanStack Query mutations (mock-first phase):**

| Factor | Server Actions + `router.refresh()` | TanStack Query mutations |
|---|---|---|
| Mock-first (in-memory repo) | Natural fit — SA calls repo directly; refresh re-reads mutated state | Requires a client-visible API surface or fabricated query function pointing at nothing real |
| Optimistic UX | Not needed for admin data-entry confirm-then-execute flow | Adds rollback complexity with no mock-phase user benefit |
| Future real-wiring | SA stays; swap only the DI factory when `core` service lands | Also requires SA or a dedicated API route; no net advantage in this story |
| Client bundle size | Zero overhead — no `QueryClient` on this subtree | Adds `useMutation` + provider weight |
| Post-mutation freshness | `router.refresh()` re-runs RSC + re-fetches all three datasets atomically | `invalidateQueries` per-key, must enumerate keys correctly |

---

### 2. State Inventory

| State item | Type | Owner | TypeScript shape | Reason |
|---|---|---|---|---|
| `classId` | URL state | `useSearchParams` (client) / `searchParams` (RSC) | `string \| undefined` | Deep-link, browser back/forward, RSC pre-fetch trigger |
| `classes` | Server state (RSC prop) | `StudentRosterScreenVm.classes` | `ClassSummary[]` | Loaded once per page mount; class-switch triggers RSC re-run |
| `currentClass` | Server state (RSC prop) | `StudentRosterScreenVm.currentClass` | `ClassSummary` | Resolved in RSC (`classes.find(c => c.id === classId) ?? classes[0]`) |
| `roster` | Server state (RSC prop) | `StudentRosterScreenVm.roster` | `RosterStudent[]` | Full roster for selected class including transferred entries |
| `activeCount` | Server state (RSC prop) | `StudentRosterScreenVm.activeCount` | `number` | Derived in RSC; avoids client re-computation |
| `transferredCount` | Server state (RSC prop) | `StudentRosterScreenVm.transferredCount` | `number` | Derived in RSC |
| `searchPool` | Server state (RSC prop) | `StudentRosterScreenVm.searchPool` | `SearchStudent[]` | Unassigned/transferable students; loaded server-side; client filters locally |
| `tableSearch` | Local form state | `RosterTable` `useState` | `string` | Table search input; controls synchronous `Array.filter` over `roster` prop |
| `page` | Local form state | `RosterTable` `useState` | `number` (1-based) | Current pagination page; resets on `tableSearch` change |
| `selected` | Local form state | `RosterTable` `useState` | `Set<string>` (studentId set) | Checkbox selection for bulk ops; cleared after successful unenroll |
| `panelQuery` | Local form state | `AddStudentPanel` `useState` | `string` | Add-panel search input; controls synchronous `Array.filter` over `searchPool` prop |
| `recentlyAdded` | Local form state | `AddStudentPanel` `useState` | `Set<string>` | Optimistic "Đã trong lớp" guard — marks a student as added immediately on click, preventing double-enroll while `router.refresh()` is in flight; reset when `enrolledIds` prop changes |
| `confirmDialog` | Local form state | `StudentRosterScreen` `useState` | `{ type: 'unenroll' \| 'transfer'; targetIds: string[]; fromClassId?: string } \| null` | Controls which confirm dialog is open and what data it operates on |
| `mutationPending` | Local form state | `StudentRosterScreen` `useState` | `boolean` | Disables all action triggers while a Server Action is in-flight; prevents double-submit and concurrent mutations |
| `toastError` | Local form state | `StudentRosterScreen` `useState` | `{ errorKey: RosterFailure['type'] } \| null` | Surfaces SA failure to the user via toast; cleared on next action or dismiss |

---

### 3. State Flow

#### RSC to ViewModel to Client (initial load)

```
browser navigates to /admin/roster?classId=cls-10a1
  ↓
RSC page.tsx reads searchParams.classId
  ↓
makeRosterRepository()  →  MockRosterRepository (USE_MOCK=true)
  ↓
Promise.all([
  repo.getClasses({ yearId: currentYearId }),
  repo.getClassRoster(classId ?? classes[0].id),
  repo.getSearchPool(),
])
  ↓
Maps results to StudentRosterScreenVm {
  classes, currentClass,
  roster, activeCount, transferredCount,
  searchPool,
}
  ↓
<StudentRosterScreen vm={vm} onEnroll={...} onUnenroll={...} ... />
  ↓
Client renders with hydrated VM as initial data; all local state initialised to defaults
```

#### Class switching (URL-driven RSC re-fetch)

```
user selects different class in RosterBreadcrumb
  ↓
router.push(`?classId=${newClassId}`)           ← URL state update; no full navigation
  ↓
Next.js RSC re-executes page.tsx with new searchParams.classId
  ↓
New VM props streamed → React reconciles
  ↓
key={classId} on StudentRosterScreen causes React to unmount + remount the component
  → all local useState (tableSearch, page, selected, panelQuery, confirmDialog) reset to initial values
  → no useEffect cleanup needed
```

#### Mutation flow — unenroll example

```
user clicks remove icon on a row
  ↓
RosterTable calls onRequestUnenrollOne(studentId) (prop callback)
  ↓
StudentRosterScreen sets confirmDialog = { type: 'unenroll', targetIds: [studentId] }
UnenrollConfirmDialog opens
  ↓
user clicks "Xác nhận"
  ↓
StudentRosterScreen: mutationPending = true; confirmDialog = null
  ↓
calls unenrollAction(classId, studentId)   ['use server']
  ↓
SA: makeRosterRepository() → repo.unenroll(classId, studentId) → { ok } | { ok: false, error }
  ↓
  ├── ok: router.refresh()
  │     → RSC re-fetches roster + searchPool atomically
  │     → new VM props → React reconciles → table shows updated roster
  │     → mutationPending = false; selected cleared
  │
  └── error: mutationPending = false
             toastError = { errorKey: result.error.type }
             → client maps errorKey → adminRoster.errors.<type> → toast
```

#### Transfer flow (two-step confirm)

```
user clicks "Chuyển lớp" on a search-pool row in AddStudentPanel
  ↓
AddStudentPanel calls onRequestEnroll(student)   (student.currentClassId !== null)
  ↓
StudentRosterScreen detects student.currentClassId !== null
  → confirmDialog = { type: 'transfer', targetIds: [student.id], fromClassId: student.currentClassId }
TransferConfirmDialog opens showing from/to class names (resolved from vm.classes)
  ↓
user clicks "Xác nhận"
  ↓
mutationPending = true; confirmDialog = null; recentlyAdded adds student.id
  ↓
calls transferAction(studentId, { fromClassId, toClassId: currentClass.id })   ['use server']
  ↓
SA: repo.transfer() → { ok } | { ok: false, error }
  ↓
  ├── ok: router.refresh()
  │     → RSC re-fetches roster (transferred student now appears) + searchPool (student no longer in pool)
  │     → mutationPending = false
  │
  └── error: mutationPending = false; toastError = { errorKey }
             recentlyAdded removes student.id (undo optimistic guard)
```

---

### 4. TanStack Query — Not used in this story

No `useQuery`, `useMutation`, or `QueryClient` is introduced. Decision basis:

- Mock-first: the `core` service is absent; there is no HTTP endpoint to cache against.
- Data freshness is guaranteed by `router.refresh()` which re-runs the RSC; stale-while-revalidate is not needed for an admin write-confirm-view cycle.
- The screen has a single data tenant (one `classId` at a time). No cross-route cache sharing is required.

**Query key taxonomy (documented for future real-wiring story, not implemented now):**

```
rosterKeys.all()                              ['roster']
rosterKeys.classes()                          ['roster', 'classes']
rosterKeys.classesByYear(yearId)              ['roster', 'classes', { yearId }]
rosterKeys.rosters()                          ['roster', 'rosters']
rosterKeys.roster(classId)                    ['roster', 'rosters', classId]
rosterKeys.searchPool()                       ['roster', 'searchPool']
rosterKeys.searchPoolQuery(q)                 ['roster', 'searchPool', { q }]
```

**Future cache policy (apply when `core` service lands):**

| Query | `staleTime` | `gcTime` | Notes |
|---|---|---|---|
| `classesByYear(yearId)` | 5 min | 10 min | Stable within an academic year |
| `roster(classId)` | 0 | 5 min | Always re-validate on window focus; mutations invalidate immediately |
| `searchPoolQuery(q)` | 30 s | 2 min | Short stale to surface newly freed-up students |

**Future invalidation map (apply when `core` service lands):**

| Trigger | Keys invalidated |
|---|---|
| `enrollAction` success | `rosterKeys.roster(classId)`, `rosterKeys.searchPool()` (broad) |
| `unenrollAction` success | `rosterKeys.roster(classId)` |
| `unenrollManyAction` success | `rosterKeys.roster(classId)` |
| `transferAction` success | `rosterKeys.roster(fromClassId)`, `rosterKeys.roster(toClassId)`, `rosterKeys.searchPool()` |
| SSE `roster.updated` event | `rosterKeys.roster(classId)` (when realtime wired per decision `0009`) |

---

### 5. Optimistic Updates — Not applied in this story

**Decision: no optimistic updates for US-E12.4.**

Rationale:

1. Mock-first: `router.refresh()` round-trip is ~50–300ms (mock delay). Optimistic UI adds complexity with no perceptible benefit.
2. Destructive and transfer operations have confirmation dialogs. The user has committed via a confirm step; a brief "processing" indicator is expected, not an instant data flip.
3. Bulk unenroll affects a `Set<string>`. Rolling back an optimistic removal of N rows is non-trivial.
4. `mutationPending = true` disables action buttons and gives immediate visual feedback during the SA round-trip — this satisfies the UX need without optimistic data mutation.

**One narrow exception — `recentlyAdded` in `AddStudentPanel`:**

This is a local UI guard (not a data optimistic update). When a user clicks "Thêm vào lớp" or "Chuyển lớp" the student's id is added to `recentlyAdded`, causing the row to immediately render as "Đã trong lớp" (disabled). This prevents a second click on the same student before `router.refresh()` completes. It is not a roster mutation — the authoritative data is still in the RSC props. `recentlyAdded` resets when `enrolledIds` prop changes (i.e., after the RSC refresh delivers updated data).

**When to introduce true optimistic updates (future, real BE, under a separate story):**

Single enroll from the Add panel is the one candidate where instant visual feedback is valuable (user may enroll several students in quick succession). Pattern at that time:

- `onMutate`: snapshot `rosterKeys.roster(classId)` → append student with `status: 'active'`
- `onError`: restore snapshot from `onMutate` context
- `onSettled`: `invalidateQueries(rosterKeys.roster(classId))`

No other operation warrants optimistic treatment.

---

### 6. Async State Machine

| State | Trigger | UI treatment | i18n path |
|---|---|---|---|
| **Loading (initial RSC)** | RSC streaming / Suspense boundary | Skeleton: `ClassInfoCard` bar (60px), `RosterTable` 8-row shimmer, `AddStudentPanel` 3-row shimmer | — |
| **Empty — no students** | `roster.length === 0` | `RosterEmptyState` with illustration + CTAs; `AddStudentPanel` remains visible | `adminRoster.empty.title`, `adminRoster.empty.body` |
| **Empty — no classes** | `classes.length === 0` | Full-page empty state; class selector and table absent; `AddStudentPanel` hidden | `adminRoster.empty.title` (variant) |
| **Populated** | `roster.length > 0` | Normal table; pagination shows if `roster.length > PAGE_SIZE` | — |
| **Mutation pending** | `mutationPending === true` | All action buttons disabled; confirm dialog's submit button shows loading spinner | — |
| **Error (SA failure)** | `toastError !== null` | Toast at bottom-right; auto-dismiss 5 s; i18n-mapped message | `adminRoster.errors.<errorKey>` |
| **Success (implicit)** | `router.refresh()` settles | Table re-renders; `selected` cleared; no explicit toast (data change is the visual confirmation) | — |
| **Table search empty** | `tableSearch` produces no filtered matches | Inline `adminRoster.table.noMatch` text row; header + pagination still visible | `adminRoster.table.noMatch` |
| **Panel search empty** | `panelQuery` produces no filtered matches | Inline `adminRoster.addPanel.noResults` in the panel scroll area | `adminRoster.addPanel.noResults` |
| **Transfer warning** | `SearchStudent.currentClassId !== null` in panel result | Amber warning banner above the row's action buttons | `adminRoster.addPanel.transferWarning` |

**Failure → i18n key mapping:**

The Server Action returns `{ ok: false, errorKey: RosterFailure['type'] }`. The client reads `errorKey` and calls `t('adminRoster.errors.' + errorKey)`. This is type-safe because `RosterFailure['type']` is a union literal whose members exactly match the i18n key leaf names (`network-error`, `unauthorized`, `not-found`, `unknown`). The server boundary never translates; stable keys cross the wire.

---

### 7. RSC / Client Boundary — Definitive

| Concern | Boundary | Mechanism |
|---|---|---|
| `classes` list | Server (RSC) | Fetched in `page.tsx` via DI; passed as `vm.classes` |
| `currentClass` metadata | Server (RSC) | Resolved in `page.tsx` (`classes.find(c => c.id === classId) ?? classes[0]`) |
| `roster` for selected class | Server (RSC) | Fetched in `page.tsx` via DI with `classId` from `searchParams`; passed as `vm.roster` |
| `activeCount`, `transferredCount` | Server (RSC) | Derived in `page.tsx`; no client computation |
| `searchPool` | Server (RSC) | Fetched in `page.tsx`; client filters locally with `panelQuery` |
| Class switching | Client → URL → Server | `router.push(?classId=)` → Next.js re-runs RSC |
| All writes (enroll / unenroll / transfer) | Client → Server Action | `actions.ts` with `'use server'`; calls `makeRosterRepository()` |
| Post-mutation data refresh | Server → Client | `router.refresh()` re-runs RSC; new VM props streamed |
| Loading skeleton | RSC Suspense | Suspense boundary wrapping `page.tsx` output renders `<RosterSkeleton />` as fallback |
| Error surface | Client prop | SA returns `{ errorKey }`; client `useState` + toast |
| Search filtering (table + panel) | Client only | Synchronous `Array.filter` over props |
| Pagination | Client only | `useState` page + slice |
| Checkbox selection | Client only | `useState<Set<string>>` |
| Confirm dialogs | Client only | `useState` open/target |

No server concern needs to move client-side; no client concern needs to move server-side for the mock-first implementation of this story.

---

### 8. Race Conditions and Resolution

| Scenario | Risk | Resolution |
|---|---|---|
| User switches class while SA is in-flight | `router.refresh()` from the SA could resolve after the new class's RSC render, overwriting it with stale-class data | `mutationPending = true` **disables the class selector** while any SA is pending. Class switch is only re-enabled after `router.refresh()` settles. |
| User triggers two SAs before the first `router.refresh()` completes | Second SA fires against mock state that has not reflected the first mutation; e.g., unenroll the same student twice → `not-found` on the second call | `mutationPending = true` disables all action buttons until `router.refresh()` completes. Operations are serialised at the UI level; no concurrent SAs possible through the UI. |
| Stale `selected` IDs after unenroll refresh | Unenrolled students' IDs remain in the `selected` Set; bulk-action bar shows "N selected" for non-existent IDs | Any successful mutation clears `selected` entirely after `router.refresh()`. Rule: mutation success = selection reset. |
| `panelQuery` / `tableSearch` / `page` state survives class switch | Filtered view shows 0 results on page 3 of the new (smaller) class | Mount `StudentRosterScreen` with `key={classId}`. React unmounts and remounts the component tree on class change, resetting all child `useState` to initial values automatically. No `useEffect` cleanup needed. |
| `searchPool` rendered stale after enroll | A student enrolled into the class still appears as available in the Add panel until the next RSC refresh | `router.refresh()` re-fetches both `roster` and `searchPool` in the same `Promise.all` in `page.tsx`. Both datasets are always in sync after a refresh. The `recentlyAdded` guard prevents a second click in the brief window before refresh completes. |
| `recentlyAdded` guard not cleared after a failed enroll | Student row stays permanently disabled even though the enroll failed | On SA error path: remove the student's id from `recentlyAdded` before setting `toastError`. Guard is only durable on success (when `enrolledIds` prop change clears it naturally). |
