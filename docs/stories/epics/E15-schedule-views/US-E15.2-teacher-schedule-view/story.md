# US-E15.2 Teacher Schedule View (Read-only — lịch dạy cá nhân)

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E15.1 (Timetable read-only view — chung `features/timetable/` + `TimetableGrid`), US-E12.5 (Timetable Builder — admin xếp TKB; US-E15.2 consume kết quả filter theo giáo viên)
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/` (extends — reuse `TimetableGrid` từ US-E15.1; KHÔNG tạo module mới)
- Shared contract/file: `bootstrap/endpoint/timetable.endpoint.ts` (thêm query lịch theo teacher), `TimetableGrid` component (shared visual với US-E15.1 + admin builder)

## Bối cảnh — vì sao tách thành US riêng (không gộp US-E15.1)

Quyết định 2026-06-19: user xác nhận **giáo viên cũng cần xem TKB**. Tách thành US-E15.2
(không mở rộng US-E15.1) vì **nguồn dữ liệu khác nhau**:
- US-E15.1 (student/parent): TKB của **một lớp** (`classId` từ profile học sinh / con).
- US-E15.2 (teacher): **lịch dạy cá nhân** — tổng hợp các tiết giáo viên dạy **xuyên nhiều lớp**
  (`teacherId` → các slot trải nhiều lớp khác nhau trong cùng một grid tuần).

Visual grid giống nhau (reuse `TimetableGrid`), nhưng query + ô hiển thị khác (ô teacher
hiển thị **tên lớp** thay vì tên giáo viên). EPIC-OVERVIEW E15 trước đây để teacher view ở
"TBD (US-E15.2)" — nay chính thức hoá.

## Product Contract

Màn hình thời khoá biểu **chỉ đọc** dành cho giáo viên (`teacher`): hiển thị lịch dạy cá
nhân trong tuần. Design source: `edustaff_5/edu/timetable-view.jsx` (`TimetableViewScreen` —
biến thể teacher; reuse grid layout).

Deliberately **decoupled** khỏi `TimetableBuilderScreen` (admin, US-E12.5):
- Không có edit affordance, không slot editor, không conflict detection/panel.
- Ô trống hiển thị "—".

**Route:**
- `/teacher/schedule` — giáo viên xem lịch dạy của mình.

### Layout màn hình

**Top bar:**
- `Năm học` selector (read-only label hoặc dropdown nếu multi-year).
- Label "Lịch dạy của tôi" (hoặc tên giáo viên đang đăng nhập).
- `Xuất PDF` ghost button (optional, có thể defer).

**Weekly grid (reuse `TimetableGrid`):**
- Cột: Thứ 2 → Thứ 7 (6 cột). Hàng: Tiết 1–5, "Giải lao trưa" (striped, merged), Tiết 6–10.
- Tiết label trái: số tiết + giờ bắt đầu/kết thúc (muted).

**Cell states (biến thể teacher):**
- **Trống (giáo viên không dạy tiết này):** nền `#F5F7FA`, text "—" muted, không click.
- **Có tiết dạy:** nền `subjectColor/15`, 3px left border `subjectColor`. Hiển thị:
  - Line 1: tên môn học (12px fw-700, màu subjectColor).
  - Line 2: **tên lớp** (10px muted) — khác US-E15.1 (vốn hiển thị tên giáo viên).
  - Line 3: phòng học (10px muted).
  - Không có pencil/edit icon khi hover.

**Subject legend:** dưới grid — chỉ môn giáo viên thực sự dạy trong tuần.

**Mock-first:** `core` service chưa ship. `GET /timetable/teacher/{teacherId}?week={weekISO}` →
`MockTimetableRepository` trả lịch dạy mock của giáo viên (reuse fixture `TV_TIMETABLE` filter
theo teacher, hoặc thêm fixture `TV_TEACHER_SCHEDULE`).

## Relevant Product Docs

- `docs/product/screens.md` — Teacher `/teacher/schedule` row
- Design source: `edustaff_5/edu/timetable-view.jsx` `TimetableViewScreen`
- `docs/product/roles-permissions.md` — teacher read-only scope (lịch dạy cá nhân)
- ADR 0044 — design handoff edustaff_5 baseline
- US-E15.1 — student/parent timetable read view (sibling, shared `TimetableGrid`)

## Acceptance Criteria

- AC1 — Teacher: xem lịch dạy của mình:
  - Teacher login → `/teacher/schedule` → grid hiển thị đúng các tiết giáo viên dạy trong tuần (xuyên nhiều lớp).
  - Ô có tiết: tên môn, **tên lớp**, phòng học.
  - Ô trống: "—".
  - Dải "Giải lao trưa" giữa Tiết 5 và Tiết 6.
- AC2 — Không có edit affordance: không nút `+`, không hover pencil, không slot editor, không conflict panel.
- AC3 — Visual consistency: màu môn học (subjectColor/15 + 3px left border) trùng với US-E15.1 + admin TimetableBuilder; reuse `TimetableGrid`.
- AC4 — Subject legend chỉ hiển thị môn giáo viên thực sự dạy.
- AC5 — Loading + Empty + Error:
  - Loading: skeleton grid.
  - Empty (giáo viên chưa có lịch dạy): empty-state + "Bạn chưa có lịch dạy trong tuần này."
  - Error: banner + retry.
- AC6 — Responsive: mobile (320px) grid scroll ngang; tiết label readable.
- AC7 — Accessibility: `<table>` semantics (`<th scope="col">` ngày, `<th scope="row">` tiết), `<caption>` sr-only; màu không là phương tiện thông tin duy nhất; "Giải lao trưa" có `role="row"` + text.
- AC8 — i18n: ngày `t('Thứ 2'...)`, tiết `t('Tiết {n}')`, "Giải lao trưa", "Lịch dạy của tôi" qua namespace `timetable`/`schedule`. Tên môn/lớp/phòng từ BE data.

## Design Notes

- Design source: `edustaff_5/edu/timetable-view.jsx` (reuse grid; teacher cell variant)
- Commands: none (read-only)
- Queries: `GetMyTeachingScheduleUseCase` (teacher) — lấy `teacherId` từ profile → fetch lịch dạy tuần
- API: `core` service — mock-first (decision 0014)
  - `GET /timetable/teacher/{teacherId}?weekStart={YYYY-MM-DD}`
- Domain (reuse + extend `features/timetable/domain/`):
  - Reuse `TimetableSlot` nhưng cell teacher cần `className` thay vì `teacherName` — bổ sung field optional `className?` vào `TimetableSlot`, hoặc `TeacherScheduleSlot { subjectName, className, room, subjectColor }`.
  - `WeeklyTeachingSchedule { teacherId, teacherName, slots: Record<dayIndex, Record<periodNumber, TeacherScheduleSlot | null>> }`
  - Failure: reuse `TimetableFailure = 'not-found' | 'network-error'`
- Component placement (decision 0026):
  - **Reuse `TimetableGrid`** (US-E15.1) — thêm prop `cellVariant: 'class' | 'teacher'` để đổi line 2 (teacher hiển thị tên lớp). KHÔNG fork grid mới.
  - `TeacherScheduleScreen` → `features/timetable/presentation/teacher-schedule/`
  - `SubjectLegend` → reuse từ US-E15.1

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `GetMyTeachingScheduleUseCase` (ok / not-found / network); mapping DTO → `TeacherScheduleSlot` (className present) |
| Integration | `MockTimetableRepository.getTeacherSchedule(teacherId)` — trả đúng slot xuyên nhiều lớp; `not-found` cho unknown teacherId |
| E2E | Storybook: `TeacherView_FullWeek`, `TeacherView_EmptySchedule`, `Loading_Skeleton`, `ErrorState` + mobile (375px); `TimetableGrid` với `cellVariant="teacher"` |
| Platform | bun build + tsc clean |
| Release | design-review gate pass; WCAG 2.1 AA (table semantics + color independence) |

## Harness Delta

- Add row `US-E15.2` to `docs/TEST_MATRIX.md` when implemented.
- Update `docs/product/screens.md`: `/teacher/schedule` → `design-ready` (US-E15.2; `timetable-view.jsx`).
- Update `docs/product/roles-permissions.md`: teacher có quyền xem lịch dạy cá nhân (read-only).

## Evidence

Implementation: `feat/us-e15.2-teacher-schedule-view` (commits `e4fa13c` domain+infra,
`36840b4` presentation+route, `33343d2` review-fix promoting `ExportPdfButton`/`ReadOnlyField`
to shared `features/timetable/presentation/timetable-view/` modules per decision `0026`).

Tests: unit 3 (`GetMyTeachingScheduleUseCase` ok/not-found/network-error) + integration 6
(mock repo `getByTeacher` multi-class + not-found; Server Action RBAC guard-fail/pass/use-case-
failure) + Storybook interaction 5 (`TeacherView_FullWeek` incl. a11y caption assertion,
`TeacherView_EmptySchedule`, `Loading_Skeleton`, `ErrorState`, `TeacherView_Mobile` @375px).
`bunx tsc --noEmit` clean. `bun vitest run` 242 files / 1278 pass. `bun run build` success
(`/[locale]/t/[tenant]/teacher/schedule` route emitted). `bun lint` clean for this diff.

fe-tech-lead-reviewer: Revision Required (1 blocking — decision-0026 verbatim `ExportPdfButton`
duplication) → fixed → re-verified green, no re-review round needed (mechanical extraction,
same tests/build proof re-run post-fix).
fe-accessibility-auditor: WCAG 2.1 AA PASS (no blocking findings; same duplication noted
informationally, resolved by the same fix).

Design review: pass
- design-system: conform — zero raw color (grep clean), reuses `TimetableGrid`/`SubjectLegend`/
  `TimetableSkeleton`/`EmptyState`/`ReadOnlyBadge` verbatim, no new tokens; matches `screens.md`
  `/teacher/schedule` entry; no generic-dashboard/anti-reference patterns (no nested cards, no
  decorative gradient/glassmorphism, existing 3px left-border subject accent is an established
  design-system pattern, not ad-hoc "AI slop" stripe).
- a11y: WCAG AA OK (fe-accessibility-auditor pass — contrast, keyboard, table semantics via
  `<th scope>`/sr-only `<caption>`, color-independence, reduced-motion inherited unmodified).
- impeccable audit: 0 findings requiring change; reviewed diff against PRODUCT.md anti-references
  and design principles — conformant, no polish applied (screen already matches the committed
  EduPortal product register).
- states: loading/empty/error/success all covered (Storybook); responsive verified at 375px
  (`TeacherView_Mobile` story) and grid `overflow-x-auto` prevents breakage at 320px reflow.

## Implementation Plan

### 0. Research findings (grounding — read before coding)

- `cellVariant: "class" | "teacher"` is **already implemented** in
  `src/features/timetable/presentation/timetable-view/timetable-grid.tsx` (US-E15.1
  built the seam ahead of time). `Cell()` already branches
  `cellVariant === "teacher" ? slot.className : slot.teacherName`. **No grid change
  needed** — only need to actually pass `cellVariant="teacher"` from a new screen.
- `TimetableSlot.className?` (domain entity), `TimetableSlotDto.className?` (DTO),
  and the mapper (`weekly-timetable.mapper.ts`) already carry `className` end-to-end.
  **No entity/DTO/mapper change needed** for the per-slot class name.
- `IWeeklyTimetableRepository` doc comment explicitly reserves `getByTeacher` as
  the additive seam (US-E15.1 plan decision 2) — confirms the additive method name.
- Existing `WeeklyTimetable` entity is class-shaped (`classId`, `className`,
  `slots`). Story's design notes propose a new `WeeklyTeachingSchedule` entity
  keyed by teacher — **decision needed** (see §1).
- Route segment `(app)/teacher/` already exists with sibling routes
  (`attendance`, `classes`, `grades`, …) each with `page.tsx` + `actions.ts` using
  `requireRole(["teacher"])` from `@/bootstrap/auth-guard` — reuse this exact
  pattern, no new guard code.
- `docs/product/design-spec.jsonc` has a **stale legacy entry** `teacherScheduleFull`
  (source `design_src/edu/teacher.jsx`, 5 time-slots × 6 days, `conflictCell`
  with `alertTriangle` + tooltip). This **conflicts** with this story's own product
  contract (10 periods + recess row, reuse `TimetableGrid`, **no** conflict
  detection — AC2). Per decision `0011` the legacy handoff is a visual/UX spec, not
  architecture, and this story's explicit AC/design-notes (backed by the newer
  `edustaff_5/edu/timetable-view.jsx` baseline) supersede it. **Flag to fe-lead**:
  `teacherScheduleFull` entry in `design-spec.jsonc` should be updated/superseded
  post-implementation (doc sync, not a new ADR — no new token/architecture
  decision, just a stale doc pointing at a different legacy source).

### 1. Domain layer — reuse-first, minimal addition

**Decision: do NOT introduce `WeeklyTeachingSchedule` / `TeacherScheduleSlot` as new
entities.** The existing `WeeklyTimetable` + `TimetableSlot` shapes already fit a
teacher's week (`slots[dayIndex][periodNumber]`); the only per-slot difference is
already-present `className`. Introducing parallel entities would fork the shape
`TimetableGrid` already consumes and violate DRY for zero behavioral gain — grid
takes a `WeeklyTimetable`, teacher schedule IS one (with `classId`/`className` at
the top level representing the teacher's own id/name instead of a class's, which
is a naming wrinkle — see below).

- `src/features/timetable/domain/entities/weekly-timetable.entity.ts` — extend the
  JSDoc only (no field change): note that for the teacher-scope view, `classId`/
  `className` at the top level hold `teacherId`/`teacherName` (documented reuse,
  not a rename — renaming would ripple through US-E15.1 call sites for no
  behavioral gain).
- `src/features/timetable/domain/use-cases/get-my-teaching-schedule.use-case.ts`
  (new, mirrors `get-my-timetable.use-case.ts` 1:1):
  ```ts
  export class GetMyTeachingScheduleUseCase {
    constructor(private readonly repo: IWeeklyTimetableRepository) {}
    async execute(weekStart?: string): Promise<TimetableViewResult<WeeklyTimetable>> {
      try { return { ok: true, data: await this.repo.getByTeacher(weekStart) }; }
      catch (err) { return { ok: false, error: toTimetableFailure(err) }; }
    }
  }
  ```
  Test first: `get-my-teaching-schedule.use-case.test.ts` (mirrors
  `get-my-timetable.use-case.test.ts`) — ok / not-found / network-error, mock
  `IWeeklyTimetableRepository`.
- `src/features/timetable/domain/repositories/i-weekly-timetable.repository.ts` —
  additive method:
  ```ts
  /** Teacher self-scope — signed-in teacher's personal teaching schedule across classes. */
  getByTeacher(weekStart?: string): Promise<WeeklyTimetable>;
  ```
  Update the doc comment to remove "not-yet-built" language for this seam.
- Reuse `TimetableViewFailure` as-is (`not-found` / `no-child` / `network-error`) —
  `no-child` unused by this path, harmless.
- Reuse `TimetableViewResult<T>` / `toTimetableFailure` as-is.

**Done when:** unit tests for `GetMyTeachingScheduleUseCase` green.

### 2. Infrastructure layer

- `src/features/timetable/infrastructure/dtos/weekly-timetable-response.dto.ts` —
  no change (already camelCase, `className` optional on slot).
- `src/features/timetable/infrastructure/mappers/weekly-timetable.mapper.ts` — no
  change (`mapWeeklyTimetable` already round-trips `className`).
- `src/features/timetable/infrastructure/repositories/mocks/fixtures.ts` — add a
  teacher-schedule seed. Two options weighed:
  - (a) reuse `TV_TIMETABLE`-style per-class `RAW` and derive a teacher view by
    filtering all classes for slots taught by one teacher name, OR
  - (b) add a dedicated compact seed `TEACHER_RAW` keyed by teacherId → dayIndex →
    periodNumber → `{ subjectId, className, room }` (mirrors existing `RAW` shape).
  **Recommend (b)** — simpler, deterministic, avoids coupling to teacher-name
  string-matching across class fixtures (fragile). Add:
  ```ts
  const TEACHER_RAW: Record<string, Record<number, Record<number, TimetableSlotDto>>> = {
    "t1": { /* seed: teacher "Cô Nguyễn Thị Hương" teaches math across 11A2 + 8B1 */ },
  };
  export const MY_TEACHER_ID = "t1";
  export function teacherScheduleDtoFor(teacherId: string): WeeklyTimetableResponseDto | null { ... }
  ```
  Include one seed with a full week (AC1 story `TeacherView_FullWeek`) and design a
  second teacherId with an empty week (or reuse "no seed" → `not-found` → mapped to
  `empty` state, matches existing `not-found`→`empty` collapse in `toDataState`) for
  `TeacherView_EmptySchedule`.
- `src/features/timetable/infrastructure/repositories/mocks/weekly-timetable.mock.repository.ts` —
  add:
  ```ts
  async getByTeacher(): Promise<WeeklyTimetable> {
    await mockDelay();
    const dto = teacherScheduleDtoFor(MY_TEACHER_ID);
    if (!dto) throw { type: "not-found" };
    return mapWeeklyTimetable(dto);
  }
  ```
- `src/features/timetable/infrastructure/repositories/weekly-timetable.repository.ts`
  (real HTTP impl, contract-ready but inert while `USE_MOCK`) — add:
  ```ts
  async getByTeacher(weekStart?: string): Promise<WeeklyTimetable> {
    try {
      const data = (await this.http.get(TIMETABLE_VIEW_EP.teacherSchedule, weekStart ? { params: { weekStart } } : undefined)) as unknown as WeeklyTimetableResponseDto;
      return mapWeeklyTimetable(data);
    } catch (err) { throw this.toFailure(err); }
  }
  ```
- `src/bootstrap/endpoint/timetable-view.endpoint.ts` — additive:
  ```ts
  /** Signed-in teacher's personal teaching schedule (per-teacher, across classes). */
  teacherSchedule: "/core/api/v1/timetable/teacher/me",
  ```
  (Story doc mentions `GET /timetable/teacher/{teacherId}?weekStart=` — since the
  teacher is always self-scoped like `myTimetable`, follow the `/me` self-scope
  convention already used for `myTimetable` rather than exposing `{teacherId}` on
  the client; BE resolves teacherId from the bearer token, consistent with
  `myTimetable`'s pattern. **Flag as open question** if BE team needs the
  path-param form instead once `core` ships.)

Test first: `weekly-timetable.mock.repository.test.ts` — extend with
`getByTeacher()` ok case (full week, multi-class) + `not-found` for unseeded
teacherId (mirrors existing `getByClass` unknown-classId test).

**Done when:** mock repository integration tests green (mapping DTO → entity
including `className` per slot, exercised end-to-end as the existing suite does).

### 3. Bootstrap DI

`src/bootstrap/di/timetable-view.di.ts` — additive factory:
```ts
export async function makeGetMyTeachingScheduleUseCase() {
  return new GetMyTeachingScheduleUseCase(await makeRepo());
}
```
No new DI file — same feature, same `makeRepo()` (mock/HTTP switch already
correct via `USE_MOCK`).

### 4. Presentation layer — new lightweight screen (not a `TimetableView` role branch)

**Decision: build a separate `TeacherScheduleScreen`, do NOT add a third
`viewerRole: "teacher"` branch to the existing `TimetableView`.** Reasoning:
`TimetableView` already carries parent-only concerns (child picker, week nav,
week-offset refetch) that don't apply to teacher (single self-scope, no week
switch per AC — "Năm học" is a static label per the story). Force-fitting a third
role into that component's `isParent` boolean branches would add conditional
complexity for a screen that's actually simpler. This matches the story's own
Design Notes (`TeacherScheduleScreen` → `features/timetable/presentation/teacher-schedule/`).
Reuses `TimetableGrid`, `SubjectLegend`, `TimetableSkeleton`, `EmptyState` — the
genuinely shared pieces — directly.

Files (new folder `src/features/timetable/presentation/teacher-schedule/`):

- `teacher-schedule.i-vm.ts`:
  ```ts
  export type TeacherScheduleErrorKey = TimetableViewFailure["type"] | "forbidden";
  export type TeacherScheduleActionResult =
    | { ok: true; data: WeeklyTimetable }
    | { ok: false; errorKey: TeacherScheduleErrorKey };
  export type TeacherScheduleDataState =
    | { status: "loading" } | { status: "empty" }
    | { status: "error"; errorKey: TeacherScheduleErrorKey }
    | { status: "success"; timetable: WeeklyTimetable };
  export interface TeacherScheduleScreenProps {
    initialState: TeacherScheduleDataState;
  }
  ```
  (Deliberately no `fetchChildTimetable`/`childList`/`viewerRole` props — this
  screen has exactly one state shape, RSC-seeded, no client refetch trigger other
  than retry-on-error.)
- `teacher-schedule.derive.ts` — thin re-export or local copy of `toDataState`
  narrowed to `TeacherScheduleActionResult`/`TeacherScheduleDataState` (same
  `not-found`→`empty` collapse logic as `timetable-view.derive.ts`). Given it's
  the exact same 6-line function shape, consider importing `toDataState` from
  `../timetable-view/timetable-view.derive` directly if the error-key unions stay
  identical (`TimetableErrorKey` already includes `forbidden`) — **prefer reusing
  the existing `toDataState`/`subjectsUsed`/`hasAnySlot` helpers as-is** rather
  than duplicating; only add a local file if the teacher union genuinely diverges.
- `teacher-schedule.tsx` (`'use client'`):
  - Header: eyebrow/title "Lịch dạy của tôi" (or teacher's name — data from
    session, out of scope for mock-first; use static i18n title for now per
    AC1/design notes), static "Năm học" read-only field (reuse pattern from
    `ReadOnlyField` in `timetable-view.tsx` — if promoted, see i18n step; if kept
    local, small enough to inline), `ExportPdfButton` (ghost, toast
    "coming soon" — reuse copy key `exportComingSoon`/`exportPdf` from
    `timetableView` namespace, same as US-E15.1, AC deems this optional/deferrable).
  - Body: `loading` → `TimetableSkeleton`; `error` → error banner + retry (same
    JSX pattern as `TimetableView`, i18n key namespace shared); `empty` →
    `EmptyState` with **teacher-specific** body copy ("Bạn chưa có lịch dạy trong
    tuần này." per AC5) — new key, see §6; `success` → `TimetableGrid
    cellVariant="teacher"` + `SubjectLegend`.
  - No `WeekNav`, no `ChildPicker`, no `weekOffset` state — single week, no
    switching (per AC, "Năm học" is a static label, not a working selector).
- `teacher-schedule.stories.tsx` — Storybook interaction tests (see §7).

**i18n namespace decision:** reuse the existing `timetableView` namespace (not a
new `teacherSchedule` namespace) for every key that is genuinely shared (days,
period, recess, errors, exportPdf, academicYear, retry, legendTitle, readOnlyBadge,
emptySlot, caption format). Add **only the teacher-specific delta keys** under
the same `timetableView` namespace (see §6) — avoids namespace proliferation for
one screen that's 90% identical copy to US-E15.1.

### 5. Route wiring

New route `src/app/[locale]/t/[tenant]/(app)/teacher/schedule/`:

- `page.tsx` (RSC):
  ```tsx
  import { TeacherScheduleScreen } from "@/features/timetable/presentation/teacher-schedule/teacher-schedule";
  import { toTeacherDataState } from "@/features/timetable/presentation/teacher-schedule/teacher-schedule.derive";
  import { getMyTeachingScheduleAction } from "./actions";

  export default async function TeacherSchedulePage() {
    const result = await getMyTeachingScheduleAction();
    return <TeacherScheduleScreen initialState={toTeacherDataState(result)} />;
  }
  ```
- `actions.ts` (`'use server'`), mirrors `student/schedule/actions.ts` exactly:
  ```ts
  "use server";
  import { requireRole } from "@/bootstrap/auth-guard";
  import { makeGetMyTeachingScheduleUseCase } from "@/bootstrap/di/timetable-view.di";
  import type { TeacherScheduleActionResult } from "@/features/timetable/presentation/teacher-schedule/teacher-schedule.i-vm";

  export async function getMyTeachingScheduleAction(): Promise<TeacherScheduleActionResult> {
    const guard = await requireRole(["teacher"]);
    if (!guard.ok) return { ok: false, errorKey: "forbidden" };
    const result = await (await makeGetMyTeachingScheduleUseCase()).execute();
    if (!result.ok) return { ok: false, errorKey: result.error.type };
    return { ok: true, data: result.data };
  }
  ```
  RBAC-guard is identical to the sibling `teacher/*` routes (`requireRole(["teacher"])`)
  — no new guard code needed; the `(app)/teacher/` layout segment already exists
  and every sibling route (`attendance`, `classes`, `grades`, …) uses this exact
  pattern.
- `actions.test.ts` — mirrors `student/schedule/actions.test.ts` (guard-fail →
  `forbidden`; guard-pass → delegates to use-case; use-case failure → mapped
  errorKey).

### 6. i18n — namespace `timetableView` (reuse + additive keys)

**Reused as-is** (no change): `days.*`, `period`, `recess`, `periodColumnHeader`,
`emptySlot`, `errors.network-error`, `errors.forbidden`, `errors.unknown`,
`errorTitle`, `retry`, `legendTitle`, `readOnlyBadge`, `academicYear`,
`yearValue`, `exportPdf`, `exportComingSoon`.

**New keys** (add to both `vi.json` and `en.json` under `timetableView`):

| Key | vi | en |
| --- | --- | --- |
| `teacherTitle` | "Lịch dạy của tôi" | "My teaching schedule" |
| `teacherEyebrow` | "Lịch dạy cá nhân" | "Personal teaching schedule" |
| `teacherSubtitle` | "Chế độ chỉ xem. Lịch dạy do nhà trường xếp; giáo viên không thể chỉnh sửa." | "Read-only. Schedule is set by the school; teachers cannot edit it." |
| `teacherEmptyTitle` | "Chưa có lịch dạy trong tuần này." | "No teaching schedule for this week yet." |
| `teacherEmptyBody` | "Bạn chưa có lịch dạy trong tuần này." | "You don't have any teaching periods scheduled this week." |
| `teacherCaption` | "Lịch dạy cá nhân, chế độ chỉ xem." | "Personal teaching schedule, read-only mode." |

(`teacherCaption` replaces the `caption` key's `{className}` interpolation since
the teacher screen's `<caption>` shouldn't say "class X" — it's cross-class.)

### 7. Test plan (mapped to story's Validation table)

| Test | File | Layer |
| --- | --- | --- |
| `GetMyTeachingScheduleUseCase` ok/not-found/network | `domain/use-cases/get-my-teaching-schedule.use-case.test.ts` | Unit |
| DTO→entity mapping incl. `className` (reuse existing `weekly-timetable.mapper.test.ts`, add a teacher-shaped fixture case if the mapper test is parametrized; otherwise confirm existing coverage already exercises `className` since it's already in the DTO) | `infrastructure/mappers/weekly-timetable.mapper.test.ts` | Unit |
| `MockWeeklyTimetableRepository.getByTeacher()` ok (multi-class) + not-found | `infrastructure/repositories/mocks/weekly-timetable.mock.repository.test.ts` | Integration |
| `getMyTeachingScheduleAction` guard-fail/pass/use-case-failure | `app/.../teacher/schedule/actions.test.ts` | Integration |
| `TeacherView_FullWeek` — grid renders className line, subject line, room; no edit affordance; legend shows only taught subjects | `presentation/teacher-schedule/teacher-schedule.stories.tsx` | Storybook interaction |
| `TeacherView_EmptySchedule` — empty state with teacher-specific copy | same file | Storybook interaction |
| `Loading_Skeleton` — skeleton renders, no table | same file | Storybook interaction |
| `ErrorState` — banner + retry button | same file | Storybook interaction |
| Mobile 375px — grid scrolls, teacher label readable (extend one story with `parameters.viewport`) | same file | Storybook interaction |
| a11y: `<table>` semantics inherited free from `TimetableGrid` (already `<th scope="col">`/`<th scope="row">`/`<caption>` sr-only) — just confirm `teacherCaption` renders in the sr-only `<caption>` | same file (play function assertion) | Storybook/a11y |
| `bun vitest run` + `bun build` + `tsc --noEmit` | n/a | Platform |

### 8. Component-architect / state-engineer need

**Recommend skipping both** for this story:

- No new component *system* — `TimetableGrid`, `SubjectLegend`, `TimetableSkeleton`,
  `EmptyState` are all reused verbatim; the only new file is a thin screen wrapper
  (`TeacherScheduleScreen`) copying an established pattern (`TimetableView`'s
  loading/empty/error/success branches) at lower complexity (no child-picker, no
  week-nav state machine).
- No non-trivial server state — this is RSC-seeded initial state + one Server
  Action for retry, identical shape to the already-shipped
  `getMyTimetableAction`/`toDataState` pattern (no TanStack Query, no new cache
  key — matches US-E15.1's precedent of plain `useState` + `useTransition`, no
  global store per project convention).
- If `fe-nextjs-engineer` discovers the "reuse `toDataState` directly vs. fork a
  parallel one" question needs a call mid-implementation, it should default to
  **reuse** (import from `timetable-view.derive.ts`) since the error-key unions
  are compatible (`TimetableErrorKey` already includes `forbidden` and the failure
  union). Only fork if teacher-specific error handling actually diverges.

## Open Questions

1. **`teacherSchedule` endpoint shape** — plan proposes self-scope
   `/core/api/v1/timetable/teacher/me` (BE resolves teacherId from bearer token,
   consistent with `myTimetable`). Story doc's raw sketch says
   `GET /timetable/teacher/{teacherId}?weekStart=`. Since `core` hasn't shipped
   (mock-first), this is contract-readiness only — confirm actual shape with BE
   `core` INTEGRATION.md once available; no runtime impact today.
2. **`design-spec.jsonc` stale `teacherScheduleFull` entry** — references a
   different legacy source (`design_src/edu/teacher.jsx`, conflict-detection
   variant) that contradicts this story's AC2 (no conflict panel). Recommend
   `uiux-docs-manager`/fe-lead update or remove that entry post-implementation to
   point at `edustaff_5/edu/timetable-view.jsx` and the actual shipped grid shape —
   doc sync, not an ADR (no new token/architecture decision).
3. **Teacher's display name** — AC's "Lịch dạy của tôi" label is static copy per
   this plan (mock-first, no teacher-name resolution wired). If a later story
   wants the teacher's actual name in the header (like `classLabel` interpolation
   for class), that needs a profile/session read — out of scope here, flag if
   product wants it now.
4. **"Năm học" as a real selector vs. static label** — story says "read-only
   label hoặc dropdown nếu multi-year"; plan defaults to **static label** (matches
   `ReadOnlyField`/`yearValue` pattern already shipped for student) since no
   multi-year data source exists yet (mock-first). Confirm with product if a
   working dropdown is actually needed for this story or a fast-follow.
