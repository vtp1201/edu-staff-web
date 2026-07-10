# US-E15.1 Timetable Read-only View (Student + Parent)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.5 (Timetable Builder — admin creates TKB; US-E15.1 consumes published data)
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/` (new feature — separate from `features/admin/timetable` builder)
- Shared contract/file: `bootstrap/endpoint/timetable.endpoint.ts` (new — or extend existing if admin builder uses same); token colors for subject cells shared visually with TimetableBuilder

## Product Contract

Màn hình thời khoá biểu **chỉ đọc** dành cho học sinh (`student`) và phụ huynh (`parent`).
Design source: `edustaff_5/edu/timetable-view.jsx` (`TimetableViewScreen`).

Deliberately **decoupled** khỏi `TimetableBuilderScreen` (admin, US-E12.5):
- Không có nút chỉnh sửa (edit affordance hoàn toàn bị bỏ).
- Ô trống hiển thị "—" thay vì "+" button.
- Không có slot editor, không có conflict detection.
- Không có conflict summary panel.

**Routes:**
- `/student/schedule` — học sinh xem TKB lớp của mình.
- `/parent/schedule` — phụ huynh xem TKB của con (có child selector nếu nhiều con).

### Layout màn hình

**Top bar:**
- `Năm học` selector (read-only label hoặc dropdown nếu multi-year data).
- `Lớp` label (học sinh thấy lớp của mình; phụ huynh thấy lớp của con đang chọn).
- `Xuất PDF` ghost button (optional, có thể defer).

**Weekly grid:**
- Cột: Thứ 2 → Thứ 7 (6 cột).
- Hàng: Tiết 1–5, dải "Giải lao trưa" (striped, merged), Tiết 6–10.
- Tiết label trái: số tiết + giờ bắt đầu/kết thúc (muted text).

**Cell states:**
- **Trống:** nền `#F5F7FA`, text "—" màu muted, không có click handler.
- **Có tiết:** nền `subjectColor/15`, 3px left border `subjectColor`. Hiển thị:
  - Line 1: tên môn học (12px fw-700, màu subjectColor).
  - Line 2: tên giáo viên (10px muted).
  - Line 3: phòng học (10px muted).
  - Không có pencil/edit icon khi hover.

**Subject legend:**
- Dưới grid: chỉ hiển thị môn học thực sự có trong TKB tuần này (màu dot + tên).

**Parent multi-child:**
- Nếu phụ huynh có nhiều con, hiển thị `ChildSwitcher` tab tương tự US-E13.7.
- Mỗi con học lớp khác → TKB grid thay đổi theo lớp của con đang chọn.

**Mock data (`TV_TIMETABLE` trong `timetable-view.jsx`):**
- `11A2` — full week đầy đủ (học sinh Nguyễn Minh Khoa).
- `8B1` — tuần thưa hơn (con thứ hai của phụ huynh — Nguyễn Thị Lan Anh).

**Mock-first:** `core` service chưa ship. `GET /timetable/{classId}?week={weekISO}` →
`MockTimetableRepository` trả `TV_TIMETABLE[classId]`.

## Relevant Product Docs

- `docs/product/screens.md` — Student `/student/schedule` + Parent `/parent/schedule` (cả hai đều `⬜ planned`)
- Design source: `edustaff_5/edu/timetable-view.jsx` `TimetableViewScreen`
- `docs/product/roles-permissions.md` — student/parent read-only scope
- ADR 0044 — design handoff edustaff_5 baseline (timetable-view.jsx là file mới)

## Acceptance Criteria

**AC1 — Student: xem TKB lớp mình:**
- Student login → `/student/schedule` → grid hiển thị đúng TKB lớp của mình.
- Ô có tiết: tên môn, tên giáo viên, phòng học.
- Ô trống: "—".
- Dải "Giải lao trưa" nằm giữa Tiết 5 và Tiết 6.

**AC2 — Parent: xem TKB của con:**
- Parent → `/parent/schedule` → thấy TKB của con (classId từ child profile).
- Single child: không có switcher.
- Multi-child: có ChildSwitcher tab; đổi tab → grid reload TKB lớp con khác.

**AC3 — Không có edit affordance:**
- Không có nút `+` ở ô trống.
- Không có hover pencil icon.
- Không có slot editor modal.
- Không có conflict panel.

**AC4 — Visual consistency với TimetableBuilder:**
- Màu môn học (subjectColor/15 background, 3px left border) trùng với admin TimetableBuilder.
- Subject legend chỉ hiển thị môn thực sự dùng trong grid.

**AC5 — Loading + Empty states:**
- Loading: skeleton grid (rows + columns outline).
- Empty class (chưa xếp TKB): empty-state illustration + "Thời khoá biểu chưa được xếp cho lớp này."
- Error: banner + retry button.

**AC6 — Responsive:**
- Trên mobile (320px): grid scroll ngang; tiết label vẫn readable.
- Touch target: ô tiết không cần ≥44px (read-only, không cần tap target).

**AC7 — Accessibility:**
- `<table>` semantics cho grid: `<thead>`, `<th scope="col">` (ngày), `<th scope="row">` (tiết).
- `<caption>` mô tả TKB (sr-only).
- Màu môn học không là phương tiện thông tin duy nhất — có text tên môn.
- Dải "Giải lao trưa" có `role="row"` và text "Giải lao trưa".

**AC8 — i18n:**
- Ngày: `t('Thứ 2', 'Mon')` ... `t('Thứ 7', 'Sat')`.
- Tiết: `t('Tiết {n}', 'Period {n}')`.
- Giải lao: `t('Giải lao trưa', 'Lunch break')`.
- Tên môn, giáo viên, phòng: từ BE data (không i18n mock strings).

## Design Notes

- Design source: `edustaff_5/edu/timetable-view.jsx` `TimetableViewScreen` + `TV_TIMETABLE` seed data
- Subject color palette: `TV_SUBJECTS` trong file (khớp với `TimetableBuilderScreen`)
- Commands: none (read-only)
- Queries:
  - `GetMyTimetableUseCase` (student): lấy `classId` từ student profile → fetch TKB
  - `GetChildTimetableUseCase` (parent): lấy `classId` từ selected child → fetch TKB
- API: `core` service — mock-first (decision 0014)
  - `GET /timetable/class/{classId}?weekStart={YYYY-MM-DD}` (hoặc không filter tuần nếu BE trả full)
- Domain: `TimetableSlot { subjectName, teacherName, room, subjectColor }`, `WeeklyTimetable { classId, className, slots: Record<dayIndex, Record<periodNumber, TimetableSlot | null>> }`
- Failure: `TimetableFailure = 'not-found' | 'network-error'`
- UI surfaces:
  - `/student/schedule` — RSC page → `TimetableViewScreen` client component
  - `/parent/schedule` — RSC page → `TimetableViewScreen` với child-switcher wrapper
- Component placement:
  - `TimetableViewScreen` → `features/timetable/presentation/timetable-view/` (new feature)
  - `TimetableGrid` (shared grid render) → `features/timetable/presentation/timetable-view/timetable-grid.tsx`
  - `SubjectLegend` → same folder (single-screen, feature-local)
  - Không đặt vào `features/admin/timetable` — admin builder là module riêng biệt

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `GetMyTimetableUseCase` (student — ok/not-found/network); `GetChildTimetableUseCase` (parent — ok/not-found/no-child); `TimetableSlot` mapping từ DTO |
| Integration | `MockTimetableRepository.getClassTimetable(classId)` — trả đúng data cho `11A2` và `8B1`; trả `not-found` cho unknown classId |
| E2E | Storybook: `StudentView_FullWeek`, `StudentView_EmptyTimetable`, `ParentView_SingleChild`, `ParentView_MultiChild_Switch`, `Loading_Skeleton`, `ErrorState` + mobile (375px viewport) |
| Platform | — |
| Release | Design review gate passed; WCAG 2.1 AA audit (table semantics + color independence) |

## Harness Delta

- Add row `US-E15.1` to `docs/TEST_MATRIX.md` when implemented.
- Update `docs/product/screens.md`: `/student/schedule` → `planned`, `/parent/schedule` → `planned`.
- Register Epic E15 in harness if applicable.
- Copy `edustaff_5/edu/timetable-view.jsx` → `design_src/edu/timetable-view.jsx` when story starts (per ADR 0044 follow-up).

## Implementation Plan

### 0. Key decisions (made here, flagged where they need fe-lead sign-off)

1. **New module, own domain shape** — follow the Design Notes verbatim: `WeeklyTimetable` /
   `TimetableSlot` (resolved names, no ID joins) in `src/features/timetable/domain/`, NOT a
   reuse of `features/admin/timetable`'s `TimetableData`/raw `TimetableSlot{subjectId,teacherId}`.
   Reason: admin's shape is optimized for edit + conflict detection (slotKey lookup, raw FKs);
   this screen is read-only display and needs resolved `subjectName`/`teacherName`/`room` with
   no conflict concept — forcing a shared entity would leak edit-only fields (`conflicts`) into
   a read surface and couple two modules the story explicitly decouples (line "Không đặt vào
   `features/admin/timetable`"). A thin BE `core` payload can resolve names server-side same as
   admin's mapper resolves subject/teacher lookups today.
2. **Role-agnostic entity now, teacher scope later (US-E15.2 hand-off)** — `TimetableSlot`
   carries both `teacherName` (used by student/parent variant) and an optional `className` (used
   by the not-yet-built teacher variant); `ReadOnlyTimetableGrid` takes a `cellVariant: "class" |
   "teacher"` prop that only affects which line renders. `IWeeklyTimetableRepository` gets one
   method now (`getByClass`); US-E15.2 adds a sibling `getByTeacher` returning the same
   `WeeklyTimetable` shape — additive, no breaking change.
3. **Endpoint file: new, not shared with admin builder** — `bootstrap/endpoint/timetable.endpoint.ts`
   already exists and is owned by `features/admin/timetable` (`TIMETABLE_EP`, CRUD + conflicts).
   Add a **new** file `bootstrap/endpoint/timetable-view.endpoint.ts` (`TIMETABLE_VIEW_EP`) rather
   than extending the admin one — same `core` service/resource family, but keeps the two feature
   modules' infra fully decoupled (no shared-file edit contention across the two stories/teams,
   per `component-organization.md` module-per-concern) and mirrors the domain-layer decision above.
4. **Subject-color tokens — gap confirmed, ADR needed for 1 of 10 colors.** Cross-checked
   `TV_SUBJECTS` (10 hexes) against `docs/product/design-system.md` palette + `src/features/admin/
   timetable/presentation/timetable-screen/timetable-static.ts` (admin builder already hardcodes
   the *same* 10 hexes and renders them as raw inline `backgroundColor` — a pre-existing
   tokens-only violation in the admin builder, not introduced here):
   | Subject | Hex | Existing token match |
   | --- | --- | --- |
   | Toán | `#5D87FF` | `--edu-primary` ✅ |
   | Ngữ văn | `#7B5EA7` | `--edu-purple` ✅ |
   | Tiếng Anh | `#13DEB9` | `--edu-success` ✅ |
   | Vật lý | `#FFAE1F` | `--edu-warning` ✅ |
   | Hoá học | `#FA896B` | `--edu-error` ✅ |
   | Sinh học | `#00B8A9` | `--edu-teal` ✅ |
   | Lịch sử | `#539BFF` | `--edu-info` ✅ |
   | GDCD | `#8898A9` | `--edu-text-muted` ✅ |
   | Thể dục | `#4570EA` | `--edu-primary` dark variant ✅ |
   | **Địa lý** | **`#946000`** | **none — gap** ❌ |
   9/10 map cleanly onto existing semantic tokens. Địa lý's brown/gold has no equivalent.
   **Flagging to fe-lead: ADR needed** (next `NNNN` ≥ `0051`) to add one token (e.g.
   `--edu-subject-geo: #946000`) to `src/app/tokens.css` + `@theme` in `globals.css` before Phase 3
   ships the legend/cell colors. Until the ADR lands, Phase 3 implements a `SUBJECT_COLOR_TOKEN`
   lookup (`subjectId → token key`) for the other 9 subjects and stubs Địa lý onto
   `--edu-text-secondary` as a documented placeholder (`// TODO ADR-00XX: dedicated geo token`) —
   never a raw hex. Also worth flagging separately (out of scope to fix here): the admin builder's
   raw-hex usage is existing debt this story does not touch.
5. **Parent child-picker: new component, not `ChildSwitcher` reuse.** Story AC2/Design source both
   call for the card-style picker (`TV_CHILDREN.map` → bordered card w/ avatar, name, class), not
   the tab-based `ChildSwitcher` from `features/grades`. Per `component-organization.md` this is
   currently single-screen (only this feature uses the card variant) → lives at
   `features/timetable/presentation/timetable-view/child-picker.tsx`, feature-local, promote to
   `components/shared/` on 2nd use (candidate: US-E15.2 has no child-picker, but a future
   attendance/discipline "per-child" screen might reuse the card style — do not pre-promote).
6. **Session→classId/children resolution: no centralized "parent's children" domain exists.**
   Grepped `features/auth`, `bootstrap/auth-guard` — `requireRole()` only decodes `role` from the
   JWT, no `userId`/`childIds`/`classId` claim is read anywhere in the app today; `features/grades`
   solves this by having its `GetChildListUseCase`/`MockGradeBookRepository.getChildList()` return
   a **hardcoded mock roster** regardless of session (no per-user scoping yet — same gap). Follow
   the same pattern here: scope a new `GetMyTimetableUseCase` (student) / `GetChildTimetableUseCase`
   (parent) inside `features/timetable/`, with the mock repository returning a fixed
   student→classId and parent→children lookup (mirrors `TV_CHILDREN`/`MOCK.student.class` in the
   design source). **Not centralized** — flag as a candidate for future consolidation once BE
   `core`/`iam` expose real "my profile"/"my children" endpoints (all three features — grades,
   timetable, and later attendance — will need the same resolution).

### Phase 1 — Domain + mock repository + unit tests

Files:
- `src/features/timetable/domain/entities/timetable-slot.entity.ts` —
  `interface TimetableSlot { subjectId: string; subjectName: string; subjectColorToken: string; teacherName?: string; room?: string; className?: string }`
  (`teacherName` used by class-scope views; `className` reserved for US-E15.2 teacher-scope; both
  optional so one entity serves both without teacher-mode fields leaking into this story's UI).
- `src/features/timetable/domain/entities/weekly-timetable.entity.ts` —
  `interface WeeklyTimetable { classId: string; className: string; slots: Record<number, Record<number, TimetableSlot | null>> }`
  (`slots[dayIndex 0-5][periodNumber 1-10]`).
- `src/features/timetable/domain/failures/timetable-view.failure.ts` —
  `type TimetableViewFailure = { type: "not-found" } | { type: "network-error" } | { type: "no-child" }`.
- `src/features/timetable/domain/repositories/i-weekly-timetable.repository.ts` —
  `interface IWeeklyTimetableRepository { getByClass(classId: string, weekStart?: string): Promise<WeeklyTimetable> }`
  (throws typed failure; `getByTeacher` added by US-E15.2, not here).
- `src/features/timetable/domain/use-cases/get-my-timetable.use-case.ts` — student: no args
  (mock repo resolves `classId` from a hardcoded session→class lookup — see decision 6); calls
  `repo.getByClass`; maps thrown failure → `{ ok: false, error }`.
- `src/features/timetable/domain/use-cases/get-child-list.use-case.ts` — parent: returns
  `ChildSummary[]` (`childId`, `name`, `className`, `avatar`, `color`) from a parent-scoped mock
  lookup (separate from `features/grades`' — no cross-feature import, per decision 6).
- `src/features/timetable/domain/use-cases/get-child-timetable.use-case.ts` — parent: takes
  `childId`, resolves `classId` via child list, calls `repo.getByClass`; `no-child` failure if
  `childId` unknown.

Test first (Vitest, mock `IWeeklyTimetableRepository`/child-list source):
- `get-my-timetable.use-case.test.ts` — ok (11A2 full week) / not-found (empty class) / network-error.
- `get-child-timetable.use-case.test.ts` — ok (single + multi child) / no-child / network-error.
- `get-child-list.use-case.test.ts` — returns fixed 2-child roster (11A2 + 8B1).

Done when: all use-case unit tests green; entities have zero framework imports.

### Phase 2 — Infrastructure (mock-first) + endpoint + DI + Server Actions + RSC pages

Files:
- `src/bootstrap/endpoint/timetable-view.endpoint.ts` — `TIMETABLE_VIEW_EP = { classTimetable:
  (classId: string) => \`/core/api/v1/timetable/class/${encodeURIComponent(classId)}\` }` (new file,
  see decision 3).
- `src/features/timetable/infrastructure/dtos/weekly-timetable-response.dto.ts` — camelCase DTO
  mirroring `WeeklyTimetable` (BE `core` not shipped — DTO shape is contract-first per decision 0014).
- `src/features/timetable/infrastructure/mappers/weekly-timetable.mapper.ts` — DTO → entity +
  `subjectId → subjectColorToken` resolution table (the 9 mapped tokens + Địa lý placeholder from
  decision 4).
- `src/features/timetable/infrastructure/repositories/weekly-timetable.repository.ts` —
  `import "server-only"`; real HTTP impl behind `USE_MOCK` (not wired live — `core` absent).
- `src/features/timetable/infrastructure/repositories/mocks/fixtures.ts` — port `TV_TIMETABLE`
  (`11A2` full week, `8B1` sparse), `TV_SUBJECTS`, and the student/parent session→class(es) lookup
  from `timetable-view.jsx` into typed fixtures (data, not i18n — per `i18n.md`).
- `src/features/timetable/infrastructure/repositories/mocks/weekly-timetable.mock.repository.ts` —
  `getByClass(classId)`: `11A2`/`8B1` → seeded `WeeklyTimetable`; any other classId → `not-found`
  (empty-state trigger).
- `src/bootstrap/di/timetable-view.di.ts` — `makeGetMyTimetableUseCase()`,
  `makeGetChildListUseCase()`, `makeGetChildTimetableUseCase()` (new file — do not add to the
  existing `timetable.di.ts` which is admin-builder-owned).
- `src/app/[locale]/t/[tenant]/(app)/student/schedule/actions.ts` — `"use server"`;
  `getMyTimetableAction()`: `requireRole(["student"])` guard first → `{ ok:false, errorKey:"forbidden" }`
  on fail → else call use-case → map failure `.type` to `errorKey` (pattern copied from
  `student/courses/[courseId]/actions.ts`).
- `src/app/[locale]/t/[tenant]/(app)/student/schedule/page.tsx` — RSC; calls the action, passes VM to
  `TimetableViewScreen`.
- `src/app/[locale]/t/[tenant]/(app)/parent/schedule/actions.ts` — `"use server"`;
  `getChildListAction()` + `getChildTimetableAction(childId)`, both `requireRole(["parent"])`-guarded.
- `src/app/[locale]/t/[tenant]/(app)/parent/schedule/page.tsx` — RSC; fetches child list once
  server-side, passes both child list + first child's timetable as initial VM (client re-fetches
  via Server Action on switch — no client-side DI/repo import, per layer rules).

Test first (Integration, Vitest):
- `weekly-timetable.repository.integration.test.ts` (mock repo, matching the admin builder's
  `timetable.repository.integration.test.ts` shape) — `getByClass("11A2")` full week,
  `getByClass("8B1")` sparse, `getByClass("unknown")` → `not-found` failure.

Done when: integration test green; both `actions.ts` files guard-first (no unguarded DI call in an
RSC page body — the exact gap flagged in the task); `tsc --noEmit` clean (server-only boundaries enforced).

### Phase 3 — Presentation + i18n + Storybook

Files:
- `src/features/timetable/presentation/timetable-view/timetable-view.i-vm.ts` — `TimetableViewVM`
  discriminated union (`loading | empty | error | success`), `success` carrying `WeeklyTimetable`
  + `role: "student" | "parent"` + (parent only) `children: ChildSummary[]`, `selectedChildId`,
  `weekOffset`/`weekDates`.
- `src/features/timetable/presentation/timetable-view/timetable-view.tsx` — `"use client"`; owns
  year/semester selector state (student) or week-nav state (parent, per design_src week-offset
  math) + child-picker state; renders header, `TimetableGrid`, `SubjectLegend`, `EmptyTKB` /
  skeleton / error banner. No `useState` for the timetable data itself — VM comes from props /
  Server Action re-fetch on child switch (TanStack Query optional here since data is small and
  action-driven; flag to `fe-state-engineer` only if child-switch UX needs client cache — likely
  not needed for a 2-child mock).
- `src/features/timetable/presentation/timetable-view/timetable-grid.tsx` — `ReadOnlyTimetableGrid`
  equivalent; **`cellVariant: "class" | "teacher"` prop** (only `"class"` implemented this story);
  `<table>` semantics per AC7 (`<caption className="sr-only">`, `<th scope="col">` per day,
  `<th scope="row">` per period, recess `<tr>` with visible text "Giải lao trưa" — not just
  `role="row"` styling, an actual table row spanning all day columns via `colSpan`).
- `src/features/timetable/presentation/timetable-view/subject-legend.tsx` — dot + name per subject
  actually present in `slots` (dedup by `subjectId`), token-colored per decision 4 map.
- `src/features/timetable/presentation/timetable-view/child-picker.tsx` — card picker (decision 5).
- `src/features/timetable/presentation/timetable-view/subject-color-tokens.ts` — the
  `subjectColorToken → { bg, border, text }` static className lookup (Tailwind needs literal
  classes, not string interpolation — e.g. `{ primary: { bg: "bg-primary/15", border:
  "border-primary/30", text: "text-primary" }, ... }`).
- i18n — new namespace `timetableView` in `messages/{vi,en}.json` (sibling to the admin builder's
  existing `timetable` namespace, kept separate per decision 3's module-isolation rationale):
  chrome copy only — day names (`mon`..`sat`), `periodN`, `recessLabel`, `readOnlyBadge` ("Chỉ
  xem"/"Read-only"), `exportPdf`, `academicYear`, `semester`, `emptyTitle`/`emptyBody`,
  `errorBanner`/`retry`, `subjectsLegendTitle`, `thisWeek`/`prevWeek`/`nextWeek`, `weekRange`,
  `childPickerLabel`. Subject/teacher/room strings stay as mock DATA (not i18n keys, per `i18n.md`).
- `src/app/[locale]/t/[tenant]/(app)/student/schedule/page.tsx` + `.../parent/schedule/page.tsx`
  wired to real components (superseding the Phase 2 stub render).

Test first (Storybook interaction, per Validation table):
`StudentView_FullWeek`, `StudentView_EmptyTimetable`, `ParentView_SingleChild`,
`ParentView_MultiChild_Switch`, `Loading_Skeleton`, `ErrorState` (+ a 375px viewport variant for AC6).

Done when: all 6 stories pass interaction tests; design-review gate checklist ready (tokens-only —
contingent on decision 4's ADR landing or the documented placeholder being in place).

### Phase 4 — Accessibility polish + QA

Files: no new files expected; adjustments inside Phase 3 components based on audit findings.
- `fe-accessibility-auditor`: verify AC7 line-by-line — table semantics, `<caption>` sr-only text,
  color+text redundancy (subject name always visible, not color-only), recess row screen-reader
  announcement, keyboard nav through child-picker cards (real `<button>`s, visible focus ring),
  contrast of `subjectColorToken` text-on-tint combos (≥ 4.5:1 body / ≥3:1 for the 3px border as a
  UI element) — re-check specifically for the Địa lý placeholder token from decision 4.
- `fe-qa-playwright`: E2E for the two routes — role-gated redirect (student cannot hit
  `/parent/schedule` and vice versa — RBAC leak check per task's "must not leak other classes'
  timetables"), parent child-switch grid reload, mobile viewport horizontal scroll (AC6).

Done when: a11y audit verdict = pass (or fixes looped back into Phase 3), Playwright Go/No-Go = Go,
`docs/TEST_MATRIX.md` row for `US-E15.1` flips from `planned` → `implemented` with proof columns filled.

### Component + state sketch

```
TimetableViewScreen (client)
├─ Header (title + read-only badge + Export PDF ghost button)
├─ Selectors row
│  ├─ student: TVSelectField×2 (year, semester) — display-only, no data reload (per design_src comment)
│  └─ parent: week-nav (← / "Tuần này" / →) + date range label
├─ ChildPicker (parent only, card style) — local UI state `selectedChildId`
├─ TimetableGrid | EmptyTKB | ErrorBanner | SkeletonGrid   (driven by VM.status)
└─ SubjectLegend (only when grid has data)
```
State classification: `weekOffset`/`yearId`/`semesterId`/`selectedChildId` = **local UI state**
(useState, not URL — no deep-linking requirement in AC); timetable data itself = **server state**
via the Server Action call chain (RSC initial load + re-invoke action on child/week change), no
Zustand, no client-side repository import.

### Open questions for fe-lead

1. **Subject-color ADR (decision 4)** — approve adding `--edu-subject-geo` (or a differently-named
   token) before Phase 3, or accept the documented placeholder-on-`--edu-text-secondary` and file
   the ADR as a fast-follow? Blocks a clean AC4 (visual consistency) sign-off either way.
2. Story's AC2 says parent single-child = "không có switcher" — confirmed no switcher renders
   (not just hidden/disabled) when `children.length === 1`.
3. "Xuất PDF" (Export PDF) is called out as optional/deferrable in Product Contract but appears in
   every design_src state — plan treats it as a **non-functional ghost button** (renders, shows a
   "coming soon" toast on click, mirrors admin builder's `exportPdfToast` pattern) rather than
   fully deferring it. Confirm that's acceptable scope for this story vs. hiding it entirely.
4. Year/semester selectors for the student view are decorative in the design source ("switching
   them does NOT load a different timetable in this prototype") — plan keeps them decorative for
   this story (no multi-year mock data exists). Confirm no AC expects them to be functional.
5. Should `getByTeacher` on `IWeeklyTimetableRepository` be stubbed as a `not-implemented`-throwing
   method now (to lock the interface shape for US-E15.2) or left entirely absent until that story
   starts? Plan defaults to **absent** (YAGNI — add when needed) unless fe-lead wants the seam
   pre-declared.

## Evidence

Design review: pass
- design-system: conform — tokens-only (no raw hex/gray/slate in production code except doc
  comments); tone-colored text uses accessible `-text`/`-foreground`/`-accessible` variants per
  ADR 0049/0050 (verified by both fe-tech-lead-reviewer and fe-accessibility-auditor); subject
  colors route through `--edu-*` tokens via `subject-color-tokens.ts`; new card-style child
  picker justified as feature-local per decision 0026 (only screen using this variant so far).
- a11y: WCAG AA — PASS after fixing 2 Major findings (A11Y-001 week-nav active button contrast
  3.29:1→4.88:1 via `--edu-primary-accessible`; A11Y-002 warning-tone subject text contrast
  4.37:1→11.42:1 via `--edu-warning-foreground`) + 2 Minor polish items (A11Y-005 emoji removed
  from translated recess string; A11Y-004 sr-only "no class" span added to empty cells). Real
  `<table>` semantics (sr-only `<caption>`, `<th scope="col">`/`<th scope="row">`, recess as a
  real `<tr>`), keyboard-operable child-picker (`<button>`, `aria-pressed`, visible focus ring,
  ≥44px target), `motion-safe:` gating, dynamic `role="alert"` error banner, `aria-busy` loading
  region. A11Y-003 (systemic non-text-contrast on subject accent borders, mitigated by always-
  visible subject-name text) deferred to a design-system fast-follow — not a per-story blocker.
- impeccable-scope critique: no palette/layout deviation from the `timetable-view.jsx` handoff;
  Địa lý subject-color gap resolved as a documented placeholder on `--edu-text-secondary` (no new
  token/ADR this story, to avoid tripping the "new design-system token ⇒ high-risk" gate for one
  cosmetic color) rather than a redesign — fast-follow ADR (≥0051) tracked as an open item.
- states: loading (skeleton, `aria-busy`) / empty (empty-class illustration) / error (`role="alert"`
  + retry, real dynamic errorKey — never hardcoded null) / success all covered by 7 Storybook
  interaction stories incl. a 320–375px mobile variant (AC6).

Reviews:
- fe-tech-lead-reviewer: **Approved**. Layering clean (domain zero-framework, `server-only` on
  both repos, guard-first Server Actions, no admin/timetable module touched). 2 non-blocking
  "consider" notes (child `classId` vs `className` latent coupling; `getChildren()` missing
  try/catch parity) — both fixed in the same pass as the a11y findings.
- fe-accessibility-auditor: **Pass-with-major-findings**, both fixed and re-verified green
  (A11Y-001/002 Major; A11Y-004/005 Minor fixed; A11Y-003 Minor deferred as design-system debt).
- fe-qa-playwright: **Conditional Pass — Go**. 8/8 AC traced to passing tests; closed one real
  coverage gap (end-to-end RBAC proof on both `actions.ts` — added 8 unit tests asserting
  `requireRole` rejection happens before any use-case/DI call). No functional defects found.

Proof:
- `bunx tsc --noEmit` → clean.
- `bun vitest run` → full suite green (240 files / 1270 tests, incl. this feature's 25 unit/
  integration + 8 new RBAC unit tests).
- Storybook interaction (`vitest --config vitest.storybook.mts`) → 7/7 stories green, no console
  errors/warnings.
- `bun run build` → green (routes `/student/schedule` + `/parent/schedule` emitted).

Open follow-ups (not blocking, tracked for later):
- Địa lý subject-color token — file a dedicated ADR (≥0051) adding `--edu-subject-geo` (or
  similarly named token) to replace the `--edu-text-secondary` placeholder.
- A11Y-003 — systemic non-text-contrast (1.4.11) on subject-cell accent borders across ~6 of 10
  tones; recommend routing to `uiux-design-system-builder` as a design-system-level fast-follow
  rather than a per-subject patch.
- No centralized "current user's classId / parent's children" resolution exists yet in the
  codebase (same gap as `features/grades`) — both features currently ship their own mock lookup;
  worth consolidating once BE `iam`/`core` expose a real "my profile"/"my children" endpoint.
