# US-E24.14 Tab "Tổng hợp chuyên cần" (teacher attendance tab 3) — range Tháng / Học kỳ / Cả năm, 4 StatCard, bảng theo HS + chip Đạt/Cảnh báo/Nguy cơ

## Status

implemented

## Lane

normal

> Read-only aggregate; không mutation. GVCN homeroom (page hiện chỉ list homeroom classes).

## Dependencies

- Depends on: none (độc lập với E24.6 dù cùng `features/attendance` — E24.6 chỉ thêm
  `student-attendance-screen/` + shared `attendance-summary`; US này thêm `attendance-summary-tab/` +
  1 use-case. Nếu chạy cùng worktree B tuần tự E24.6 → E24.14 thì không xung đột.)
- Blocks: none
- Feature module(s) chạm: `src/features/attendance/**` (domain use-case mới
  `SummarizeClassAttendanceUseCase`, entity `StudentAttendanceSummary`, repo method
  `getClassAttendanceRange(classId, from, to)` — **tách khỏi** `getAttendanceHistory` (cap 31 ngày),
  presentation `attendance-screen/attendance-summary-tab/**`), `(app)/teacher/attendance/actions.ts`
  (+ `getAttendanceSummaryAction`), `bootstrap/di/attendance.di.ts`, `bootstrap/endpoint/attendance.endpoint.ts`
  (không đổi path; có thể thêm `classAttendanceSummary(classId)` nếu chọn US-245).
- Shared contract/file: `components/shared/progress-bar/` (E24.6 tạo — nếu E24.6 chưa merge thì US này
  tạo, bên kia reuse; **không tạo 2 bản**), `messages` namespace `attendance`.

## Hiện trạng FE (grep 2026-09-06)

- `/teacher/attendance` (`attendance-screen.tsx`): filter lớp (homeroom only —
  `ListMyHomeroomClassesUseCase`) + ngày; `Tabs` 2 tab `attendance.tabs.today|history`. Tab History:
  `AttendanceHistoryContainer` (TanStack `attendanceKeys.history(classId, from, to)`, cửa sổ 7 ngày,
  `getAttendanceHistoryAction`) → `ListAttendanceHistoryUseCase` **throw `invalid-request` nếu >31
  ngày** (`MAX_HISTORY_DAYS`, ADR 0058 §5) → **không dùng được cho HK/năm**; cần use-case riêng.
- Repo real `AttendanceRepository.getAttendanceHistory` gọi 1 range call (US-E18.47, BE US-187) rồi
  `aggregateRangeDaySummaries` (per-day). Roster tên HS: `ATTENDANCE_EP.classStudents`. Vocabulary
  `AttendanceStatus = present|absent|late|excusedAbsent` (ADR 0058) → reuse `ATTENDANCE_STATUS_TONE`.
- `StatCard`, `StatusBadge`, `Table` có sẵn; `ProgressBar` chưa có shared.
- i18n `attendance.summary.*` (present/absent/late/excusedAbsent/rate/total) có sẵn → reuse;
  `attendance.tabs` thêm `summary`; mới `attendance.summaryTab.*`.
- Term source: `CALENDAR_EP.activeYear` + `terms(yearId)` (`/core/api/v1/academic-years/*`, feature
  admin calendar) — E24.7 ghi "không có term-source" là chưa thấy file này; **[OPEN QUESTION Q1]**
  TEACHER có quyền GET `academic-years/active` + `terms`? Nếu 403 → ẩn range "Học kỳ"/"Cả năm", chỉ còn
  "Tháng" (month picker) và ghi ask BE.

## Product Contract

Design v3: `design_src/edu/classops.jsx` → `AttendanceSummaryTab` (lines 454–630). design-spec
`screens.attendance` cần thêm mục `summaryTab` (fe sync cùng commit, giá trị lấy từ jsx).

- Tab 3 "Tổng hợp chuyên cần" sau History. Controls card: Lớp (reuse filter lớp hiện có của page — URL
  `?class=`; **không** vẽ lại chip lớp), Phạm vi = segmented `month | term | year` (URL `?range=`,
  `?month=YYYY-MM` khi month), nút "Xuất Excel" **defer** (không render — EPIC quyết).
- Nguồn: `GET /core/api/v1/classes/{classId}/attendance?startDate&endDate` (≤366 ngày; GVCN/ADMIN/
  MANAGER) → `ClassAttendanceRangeResponse.records[]` `{date, studentMemberId, status}` → aggregate
  client theo HS: `present`, `late`, `excused`, `absent`, `recorded = tổng ngày có bản ghi của HS đó`,
  `rate = present / recorded` (LATE **không** vào numerator — nhất quán US-245 `AttendanceSummary`);
  `recorded = 0` → rate `null` → hiển thị "—", không xếp hạng. Tên HS từ roster `classStudents` (join
  `studentMemberId`; thiếu tên → "HS #n" fallback như ChildSwitcher ordinal).
- Alternative đã cân nhắc: `GET classes/{id}/attendance/summary?termId` (US-245 — **đã trong
  openapi.yaml deployed**, auth rộng hơn: cả GVBM) trả sẵn per-student `AttendanceSummary`. Chọn range
  endpoint vì cần cả "Tháng" và "Cả năm" (summary chỉ theo term) và giữ 1 nguồn số; ghi ask BE nếu muốn
  GVBM xem (khác auth). Reviewer có thể đổi sang summary cho `term` nếu số lệch (denominator per-student
  giống nhau nên không lệch).
- Range: `month` = ngày đầu→cuối tháng (clamp ≤ hôm nay); `term` = `[term.startDate, term.endDate]` của
  học kỳ hiện tại (active year → term chứa hôm nay, chọn được HK khác qua dropdown); `year` =
  `[year.startDate, min(year.endDate, today)]` (≤366 — nếu >366 thì clamp và ghi chú).
- 4 StatCard: "Chuyên cần trung bình lớp" (mean rate của HS có `recorded>0`; tone success ≥95 / warning
  90–95 / error <90), "Tổng buổi vắng có phép" (warning), "Tổng buổi vắng không phép" (error), "HS dưới
  ngưỡng 90%" (error nếu >0, success nếu 0). **Copy "buổi"** thay "tiết" (BE theo ngày).
- Bảng: STT, Học sinh (avatar initials + tên), Có mặt `present/recorded`, Vắng phép, Vắng KP (— khi 0),
  Tỉ lệ (ProgressBar + `%` `tabular-nums`), chip `StatusBadge` Đạt (≥95, success) / Cảnh báo (90–95,
  warning) / Nguy cơ (<90, error). Sort mặc định theo rate tăng (HS yếu lên đầu) — **[OPEN QUESTION
  Q2]** design không sort (theo STT); mặc định giữ STT, cho toggle sort cột Tỉ lệ.
- Aside 280px: "Cảnh báo chuyên cần" (list Nguy cơ rồi Cảnh báo; empty "Không có học sinh nào dưới
  ngưỡng."); nút "Báo PH" **không render** (không có BE notify → ask BE, ghi backlog); card "Ngưỡng đánh
  giá" (3 dòng chú giải, dot + label + %). Responsive `<1024`: aside xuống dưới; `<768` StatCard 2×2;
  bảng `overflow-x-auto` minWidth 660.
- States: loading skeleton (StatCard skeleton shared + 6 hàng), empty (không bản ghi trong range →
  "Chưa có điểm danh trong khoảng này"), error + retry (`ListError` shared; `ATTENDANCE_FORBIDDEN` →
  không retry), range quá 366 → không gọi, thông báo.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#screens.attendance` (+ thêm `summaryTab`), `docs/product/screens.md`
  hàng Attendance (teacher)
- `../edu-api/services/core/docs/openapi.yaml`: `getClassAttendance` (range mode),
  `getClassAttendanceSummary` (US-245), `academic-years`/`terms`
- `docs/decisions/0058-*` (attendance model), `.claude/rules/design-system.md` (StatCard/Badge/ProgressBar)

## Acceptance Criteria

- Pure `summarizeClassAttendance(records, roster)`: per-HS counts đúng; LATE không vào numerator nhưng
  vào `recorded`; HS không có bản ghi → `rate=null`, chip không render, không vào mean; ngưỡng biên
  95.0 → Đạt, 89.9 → Nguy cơ, 90.0 → Cảnh báo (test).
- `resolveSummaryRange(kind, today, terms)` pure: month/term/year đúng biên, clamp today, >366 → lỗi
  `invalid-request` (không gọi wire).
- Repo test: 1 call range đúng `startDate/endDate`, envelope parse; 403 → `forbidden`; roster join thiếu
  tên → fallback ordinal.
- Đổi range → URL `?range=` đổi, query key mới, không refetch tab Today/History; đổi lớp giữ range.
- Không có term (403/empty) → segmented chỉ còn "Tháng", không crash (Storybook `no-terms`).
- Storybook: full / no-alerts / empty / error / loading / no-terms / viewport 375.
- i18n vi+en `attendance.tabs.summary`, `attendance.summaryTab.*`; reuse `attendance.summary.*`.
- Gate xanh; design-review + a11y (chip = text + tone, ProgressBar `aria-valuenow`, bảng có caption/
  `scope=col`, 44px targets segmented).

## Design Notes

- Queries: `attendanceKeys.summary(classId, from, to)`; action `getAttendanceSummaryAction(classId,
  from, to)` → `SummarizeClassAttendanceUseCase` (repo `getClassAttendanceRange` + `getClassStudents`
  `Promise.all`); terms qua `getTermsAction()` (calendar DI reuse `features/admin/calendar` use-case
  nếu có; nếu feature-local admin → thêm use-case đọc ở `bootstrap/di/calendar.di.ts`, không import
  cross-feature từ presentation).
- UI: `attendance-summary-tab/{attendance-summary-tab.tsx, summary-controls.tsx, summary-table.tsx,
  alerts-panel.tsx, thresholds-card.tsx, attendance-summary-tab.i-vm.ts}`; `ProgressBar` shared.
- Domain: `StudentAttendanceSummary { studentId, name, present, late, excused, absent, recorded,
  rate: number|null, band: 'ok'|'watch'|'risk'|null }`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | summarize + band + range resolver (deterministic clock) |
| Integration | repo range call + roster join; action error mapping |
| E2E | Storybook states + range switch interaction |
| Platform | tsc/vitest/build; curl range 1 HK qua Kong khi stack lên |
| Release | design-review + a11y |

## Harness Delta

Ask BE mới: (a) endpoint "thông báo PH về chuyên cần" (nút Báo PH); (b) TEACHER đọc `academic-years/
terms`. Ghi vào `docs/reports/2026-09-xx-fe-to-be-asks-*.md` khi chạy.

## Plan

> Re-verified against current code (2026-09-06), not just the packet's 2026-09-06
> grep note — no material drift found, but the ground-truth below is more precise
> than the note in three places: (1) the range DTO already exists flat with
> `studentMemberId` (`ClassAttendanceRangeRecordDto`) — the new repo method is a
> thin sibling call, no new DTO; (2) `resolve-student-range.ts`
> (`features/attendance/presentation/student-attendance-screen/`) is a DIRECT,
> already-shipped precedent for "read `academic-years` from a non-admin action
> with graceful 403-degrade" — it fully resolves Design Notes' Q1 concern, so no
> new `bootstrap/di/calendar.di.ts` factory or feature-local wrapper is needed,
> just reuse `makeListYearsUseCase` + a structural range-resolver in this
> feature; (3) `attendance-screen.tsx`'s `Tabs` has NO URL sync today
   > (`defaultValue="today"`, client-only) and `AttendanceHistoryContainer` has no
> URL-synced range either — only `AttendanceFilters` (`?class=`/`?date=`) is
> URL-driven. So this tab's own `?range=`/`?month=`/`?term=` params are net-new
> URL state, additive and independent of the existing two tabs' behaviour (AC
> "không refetch tab Today/History" holds trivially: neither reads these params
> or invalidates on them).

### Phase 1 — Domain (pure, TDD-first)

Files:
- `src/features/attendance/domain/entities/student-attendance-summary.entity.ts` — NEW
  `StudentAttendanceSummary { studentId, name, present, late, excused, absent,
  recorded, rate: number | null, band: 'ok' | 'watch' | 'risk' | null }` +
  `ClassAttendanceSummary { students: StudentAttendanceSummary[], meanRate: number
  | null }` (mean over `recorded > 0` students only, per packet).
- `src/features/attendance/domain/summarize-class-attendance.ts` — NEW pure
  `summarizeClassAttendance(records: ClassAttendanceRangeRecordDto-shaped rows |
  a domain-level `{date, studentId, status}` type, roster: {studentId, name}[]):
  ClassAttendanceSummary`. Mirrors `summarize-attendance.ts`'s `countStatuses`
  shape but keyed per-student instead of per-month: LATE counted into `recorded`,
  excluded from `rate` numerator (same rule as `AttendanceSummary`); zero-record
  student → `rate: null`, `band: null`, excluded from `meanRate`; band boundaries
  **exactly** `rate >= 95 → 'ok'`, `rate >= 90 → 'watch'`, else `'risk'` (closed
  intervals per packet: 95.0 ok, 90.0 watch, 89.9 risk).
  - Input type: takes a plain `{ studentId: string; status: AttendanceStatus }[]`
    (already domain-mapped) rather than the wire DTO, so this module has zero
    infrastructure coupling — the repository maps wire→domain status before
    calling it (same layering as `aggregateRangeDaySummaries`, which stays
    infra-side because it deals with the DTO directly; this one is domain-side
    because its input is already `AttendanceStatus`).
  - Roster-name join + ordinal fallback (`"HS #n"`) happens in the USE CASE
    (Phase 2), not here — this fn takes an already-named roster so it stays a
    pure counting function with no i18n/formatting concerns.
- `src/features/attendance/domain/resolve-summary-range.ts` — NEW pure
  `resolveSummaryRange(kind: 'month' | 'term' | 'year', todayIso: string, years:
  YearWindow[]): { startDate: string; endDate: string } | AttendanceFailure`
  (returns the failure object directly, not throw — this fn also decides
  month-range with no `years` input needed, so keeping it a plain return keeps
  the "month never needs a year" path test-simple; the use-case throws it same
  as `ListAttendanceHistoryUseCase` does for its own bound).
  - `month`: first→last calendar day of current month, clamp end to `todayIso`.
  - `term`: `termRangeFor`-equivalent lookup but exposed as `termsOf(years,
    todayIso)` returning the FULL active-year term list (not just the containing
    one) since design wants a term **dropdown**, not just "current term". Reuses
    the `YearWindow`/`TermWindow` structural shape from
    `resolve-student-range.ts` — import it directly (type-only, same
    feature) rather than re-declaring.
  - `year`: `[activeYear.startDate, min(activeYear.endDate, todayIso)]` — NOTE:
    `AcademicYear` (admin calendar entity) has NO `startDate`/`endDate` today,
    only `terms[]`. Plan derives year bounds as `min(terms[].startDate)` /
    `max(terms[].endDate)` of the active year rather than assuming a year-level
    field exists (verify this against `AcademicYear` entity — confirmed empty of
    year-level dates in this grep; flag if BE/admin calendar adds one later).
  - `>366 days` (after clamp) → `{ type: 'invalid-request' }`, no wire call —
    matches `ListAttendanceHistoryUseCase`'s reject-not-truncate posture.
- Tests (RED first): `summarize-class-attendance.test.ts` (per-student counts;
  LATE in `recorded` not numerator; zero-record → null/excluded; boundary table
  95.0/90.0/89.9; `meanRate` excludes null-rate students),
  `resolve-summary-range.test.ts` (month/term/year boundaries with an injected
  `todayIso` — no `Date.now()`; >366 clamp+failure; empty `years` → term/year
  kinds degrade to a `no-terms` sentinel the presentation layer reads, NOT a
  thrown failure — see Phase 3 states).

### Phase 2 — Infrastructure (server-only)

Files:
- `src/features/attendance/domain/repositories/i-attendance.repository.ts` —
  add `getClassAttendanceRange(classId: string, from: string, to: string):
  Promise<{ studentId: string; status: AttendanceStatus; date: string }[]>` as
  a NEW method, sibling to `getAttendanceHistory` (packet is explicit: do not
  raise `MAX_HISTORY_DAYS`, do not reuse the capped method — ADR `0058` §5
  intentionally bounds History; this method has its own ≤366 bound enforced by
  `resolveSummaryRange`, not `ListAttendanceHistoryUseCase`).
- `src/features/attendance/infrastructure/repositories/attendance.repository.ts`
  — implement `getClassAttendanceRange`: ONE call to
  `ATTENDANCE_EP.classAttendance(classId)` with `{ startDate: from, endDate: to
  }` (same route/params shape `getAttendanceHistory` already uses — no new
  endpoint constant needed), returning `ClassAttendanceRangeResponseDto.records`
  mapped via `mapStatusFromWire` (existing mapper fn, no new DTO). Roster read
  reuses `fetchAllPages<ClassRosterItemDto>(ATTENDANCE_EP.classStudents(classId))`
  — same private helper, no duplication.
- `src/features/attendance/infrastructure/repositories/mocks/attendance.mock.repository.ts`
  + `fixtures.ts` — add a mock `getClassAttendanceRange` returning deterministic
  fixture rows spanning ≥2 months with at least one student in each band (ok/
  watch/risk) and one zero-record student, so Storybook `full`/`no-alerts`
  states have real data to render.
- `src/features/attendance/domain/use-cases/summarize-class-attendance.use-case.ts`
  — NEW `SummarizeClassAttendanceUseCase`: `Promise.all([repo.
  getClassAttendanceRange(classId, from, to), repo.getClassStudents-equivalent])`
  — reuses the SAME roster source `GetClassAttendanceUseCase`/repository already
  calls (`ATTENDANCE_EP.classStudents` via the repo, not a second HTTP call from
  the use-case — the roster join happens repo-side exactly like
  `getAttendanceHistory` does for `totalStudents`, OR the use-case receives
  already-joined `{studentId, name, status, date}[]` from the repo — pick the
  latter: extend `getClassAttendanceRange`'s return to include `name` pre-joined
  with ordinal fallback, mirroring `getClassAttendance`'s existing
  `nameByMemberId` join pattern, so the use-case body is just
  `summarizeClassAttendance(rows)` + failure mapping). This keeps roster-join
  logic in ONE place (repository) instead of splitting it between repo and
  use-case.
  - Tests: use-case test with a fake `IAttendanceRepository` (unit, no HTTP) +
    `attendance.repository.test.ts` new cases (range call params, envelope
    parse, 403→`forbidden`, roster-name-missing→ordinal fallback).
- `src/bootstrap/di/attendance.di.ts` — add
  `makeSummarizeClassAttendanceUseCase()` factory (same `makeRepo()` reused, no
  changes to it).
- **Term source (Q1 resolution — reuse, no new DI factory):** the Server Action
  (Phase 3) calls `makeListYearsUseCase()` from `@/bootstrap/di/calendar.di`
  directly (already-exported, already used cross-feature by
  `student/attendance/page.tsx`) inside a `try { ... } catch { return null }`,
  exactly like `resolveTermRange()` in that page. No new DI factory, no
  cross-feature import from `presentation/` (the Server Action lives in
  `app/.../actions.ts`, which is allowed to import multiple `bootstrap/di/*`
  factories — that's the existing precedent, not a violation of the
  presentation-layer rule). `resolveSummaryRange`'s `YearWindow`/`TermWindow`
  types are imported type-only from `resolve-student-range.ts` (same feature,
  no new cross-feature coupling beyond what already exists).

### Phase 3 — Presentation + i18n + Storybook

Files (all NEW, additive to `attendance-screen.tsx`):
- `src/features/attendance/presentation/attendance-screen/attendance-summary-tab/`
  - `attendance-summary-tab.i-vm.ts` — VM discriminated union: `{status:
    'loading'} | {status: 'empty', range} | {status: 'error', errorKey} |
    {status: 'ready', range, rangeKind, availableTerms: TermWindow[] | null,
    summary: ClassAttendanceSummary}`. `availableTerms: null` = term/year
    segments hidden (Q1 403/empty fallback); `availableTerms: []` also treated
    as hidden (no terms configured).
  - `attendance-summary-container.tsx` — `'use client'`, owns
    `useSearchParams`/`useRouter` for `?range=`/`?month=`/`?term=` (mirrors
    `AttendanceFilters`'s `update()` pattern) + `useQuery({queryKey:
    attendanceKeys.summary(classId, from, to), queryFn: () =>
    getAttendanceSummaryAction(classId, from, to)})`. New query key in
    `attendance-query-keys.ts`: `summary: (classId, from, to) =>
    ["attendance-summary", classId, from, to] as const` — independent key
    family from `attendance-history`/`history`, so switching `?range=` never
    touches Today/History's cached queries (AC).
  - `summary-controls.tsx` — segmented `month | term | year` (reuse
    `Tabs`/`ToggleGroup` primitive already in `components/ui/`, verify which
    exists before picking — NOT a new primitive) + conditional month-picker
    input or term `Select`; hides term/year options when `availableTerms ===
    null`.
  - `summary-table.tsx` — `<table>` with `<caption>` (a11y AC) + `scope="col"`
    headers: STT, Học sinh (avatar-initials + name — reuse the avatar-initials
    pattern from `attendance-summary` shared component or `ChildSwitcher`, NOT
    a new avatar component), Có mặt, Vắng phép, Vắng KP (`—` at 0), Tỉ lệ
    (`ProgressBar` from `components/shared/progress-bar` + `%` `tabular-nums`
    text), chip (`StatusBadge` tone `success|warning|error` for
    `ok|watch|risk`, `variant`/label Đạt/Cảnh báo/Nguy cơ — no chip rendered
    for `band === null`). Sort: default STT (array order from use-case), a
    clickable "Tỉ lệ" header toggles ascending-by-rate (client-side
    `Array.prototype.toSorted`, no server round-trip) — resolves Q2 without
    blocking (design shows no sort; AC's parenthetical "cho toggle" is honored
    minimally as a header-click affordance, default view matches the mockup).
  - `alerts-panel.tsx` — list of `risk` band students first, then `watch`;
    empty state text `attendance.summaryTab.noAlerts`; "Báo PH" button NOT
    rendered (packet decision, no BE endpoint — ask BE tracked in Harness
    Delta).
  - `thresholds-card.tsx` — static 3-row legend (dot + label + `%`), no data
    dependency, could be inline in `alerts-panel.tsx`'s aside instead of a
    separate file if trivial — decide at implementation time; keep as its own
    file per Design Notes for now (cheap to merge later, harder to split).
  - `attendance-summary-tab.tsx` — composes controls + 4 `StatCard`s (`bg`
    tones: primary/warning/error/error-or-success — reuse `StatCard`/
    `StatTone` as-is, no new tone) + `summary-table` + aside
    (`alerts-panel`+`thresholds-card`), loading via `StatCardSkeleton` (×4) +
    `ListSkeleton` (`variant="inline"`, 6 rows) composed together, error via
    `ListError` (existing props: `onRetry`, `retryLabel`, `title`/`description`
    family — no `message` combo), empty via a simple centered text block
    (mirrors `attendance-screen.tsx`'s existing inline empty pattern for
    `!roster`, not a new shared empty-state component — single caller so far).
- `src/features/attendance/presentation/attendance-screen/attendance-screen.tsx`
  — additive edit only: new `<TabsTrigger value="summary">` +
  `<TabsContent value="summary">` rendering `<AttendanceSummaryContainer
  classId={filters.classId} getSummaryAction={getSummaryAction} />`. Today/
  History content unchanged.
- `attendance-screen.i-vm.ts` — add `getSummaryAction` to `AttendanceScreenVM`
  (same `AttendanceActionResult<T>` pattern as `getHistoryAction`).
- `(app)/teacher/attendance/actions.ts` — add `getAttendanceSummaryAction(
  classId, from, to)` (calls `makeSummarizeClassAttendanceUseCase`, maps via
  `toAttendanceFailure`) and `getAttendanceTermsAction()` (wraps
  `makeListYearsUseCase` + the try/catch-to-null pattern from
  `resolveTermRange`, returning `TermWindow[] | null`) — both plain async
  functions (not tied to the page's RSC render), called from the client
  container.
- `(app)/teacher/attendance/page.tsx` — thread `getSummaryAction` +
  `getTermsAction` (or just `getSummaryAction` if terms are fetched via their
  own separate client-side call — prefer: container calls
  `getAttendanceTermsAction()` once on mount via its own `useQuery`, keyed
  `attendanceKeys.terms()`, so it isn't re-fetched on every range switch).

### Phase 4 — i18n

- `attendance.tabs.summary` (vi/en) — new key alongside existing
  `attendance.tabs.today`/`history`.
- `attendance.summaryTab.*` — new namespace: controls labels (`month`, `term`,
  `year`, `exportExcel` — unused for now but NOT added since the button is
  deferred/not rendered, per YAGNI), table headers, chip labels (`ok`/`watch`/
  `risk` → Đạt/Cảnh báo/Nguy cơ), `noAlerts`, `empty`, `noTerms` notice,
  `rangeTooLarge` notice, thresholds legend copy.
- Reuse VERBATIM (no new keys): `attendance.summary.present/absent/late/
  excusedAbsent/rate/total` — confirm actual key names in `messages/vi.json`
  under `attendance.summary` before wiring `summary-table.tsx`'s headers.

### Phase 5 — States (design-review + a11y proof)

Loading (skeleton), empty ("Chưa có điểm danh trong khoảng này"), error+retry
(`ListError`, `forbidden` → no retry button per existing `ATTENDANCE_FORBIDDEN`
convention — check how `AttendanceHistoryContainer`/other callers suppress
retry-on-forbidden, likely a `errorKey === 'forbidden'` branch in the
container), no-terms degrade (segmented shows only "Tháng"), range>366 clamp
+ notice (resolved client-side by `resolveSummaryRange` before the wire call —
never reaches the server as an error).

### Storybook states to cover
`full`, `no-alerts` (all `ok`), `empty`, `error`, `loading`, `no-terms`,
viewport 375 — matches AC exactly.

## Component + state sketch

No hand-off to `fe-component-architect` or `fe-state-engineer` — sketched in
full above, same call as E24.6's plan. Reasoning:
- **Component architect not needed**: every new visual primitive already exists
  (`ProgressBar`, `StatCard`, `StatusBadge`, `ListError`, `ListSkeleton`,
  `StatCardSkeleton`). This tab is a NEW composition, not a new component
  system — the file list above (6 files under `attendance-summary-tab/`) is a
  standard container+presentational split, not a novel component-tree problem.
- **State engineer's concern (flagged by the task, addressed here)**: yes,
  this has more state-shape complexity than E24.6 (3rd tab's own query key +
  URL params + a conditional term-source + client-side sort), but each piece
  individually mirrors an EXISTING precedent already in this exact feature:
  URL-synced filters → `AttendanceFilters`; independent per-tab TanStack query
  key → `AttendanceHistoryContainer`; graceful degrade on a cross-feature admin
  read → `resolve-student-range.ts`. There is no genuinely new state pattern to
  design, only composition of three known ones. Server state: `useQuery` × 2
  (summary, terms — both server data, no Zustand). URL state: `?range=`
  (`month|term|year`), `?month=YYYY-MM` (when `range=month`), `?term=<id>`
  (when `range=term`) — all optional, default `range=month` + current month.
  Local state: table sort direction (`useState`, ephemeral, not URL-synced —
  resets on range change, acceptable per Q2's minimal-affordance resolution).
  If, during implementation, the term-dropdown UX turns out non-trivial (e.g.
  needs cross-year term search), escalate to `fe-state-engineer` then — not
  blocking the plan now.

## Risks, dependencies, open questions

- **`AcademicYear` has no year-level `startDate`/`endDate`** (only
  `terms[].startDate/endDate`) — `year` range is derived as
  `min(terms.startDate)..min(max(terms.endDate), today)`. If a year has zero
  terms, `year` range degrades the same as `no-terms` (hide segment). Flag to
  `fe-tech-lead-reviewer`: confirm this derivation is acceptable or whether BE
  should be asked for year-level dates (Harness Delta candidate, not blocking).
- **US-245 `getClassAttendanceSummary?termId` alternative** (packet already
  chose the range endpoint over it) — reviewer may reconsider only if computed
  numbers disagree with BE's own `AttendanceSummary` for the `term` case; both
  should agree since denominator logic (`recorded`, LATE-excluded numerator) is
  the same rule BE documents for US-245.
- **[OPEN QUESTION Q1 — resolved for build]**: term-source 403 → month-only
  fallback, per `resolve-student-range.ts` precedent. No ask-user needed.
- **[OPEN QUESTION Q2 — resolved for build]**: default sort = STT order, rate
  column header is clickable to toggle sort — matches design (no sort shown)
  while satisfying the AC's parenthetical. No ask-user needed.
- **No new design token needed** — `StatTone`/`StatusTone`/`ProgressBarColor`
  already cover primary/success/warning/error; no ADR required.
- **Ask BE (Harness Delta, unchanged from packet)**: (a) "Báo PH" notify
  endpoint, (b) confirm TEACHER role is intentionally excluded from
  `GET /academic-years` (currently ADMIN-shaped) — if BE says it's fine to open
  it up, Q1's fallback becomes unnecessary but should stay as defensive code
  regardless.

## Evidence

> Status vẫn `in-progress`: `fe-lead` flip `implemented` sau design-review gate + merge.
> Mọi con số dưới đây là kết quả chạy thật trên branch `feat/us-e24.14-attendance-summary-tab`
> (worktree `us-e24.14`), sau vòng fix review.

### Commits

`f3d1c3f0` (plan) · `0d6b11bd` (phase 1 domain) · `5f50c635` (phase 2 repo/use-case/DI) ·
`fbcc6dab` (phase 3–4 UI + URL state + i18n + stories) · `58be14df` (phase 5 design-spec +
screens.md) · `c0ff7729` (memory) · + commit vòng fix review (mục "Fix round" bên dưới).

### Proof theo tầng

| Tầng | Proof thật |
| --- | --- |
| Unit | `summarize-class-attendance.test.ts` (8): counts per-HS, LATE vào `recorded` nhưng ngoài numerator, `recorded=0` → `rate`/`band` `null` + ngoài `meanRate`, bảng biên 95.0 → Đạt / 90.0 → Cảnh báo / 89.9 → Nguy cơ. `resolve-summary-range.test.ts` (24): month/term/year đúng biên với `todayIso` inject (không đọc `Date.now()`), clamp tới hôm nay, `termsOf` chỉ lấy năm active + loại term có ngày không ISO, đúng 366 ngày được chấp nhận / >366 bị từ chối trước mọi wire call, **và (fix round) 2 nguyên nhân invalid tách rời**: `too-large` vs `invalid-selection`. `summarize-class-attendance.use-case.test.ts` (4) với fake `IAttendanceRepository`, không chạm HTTP. |
| Integration | `attendance.repository.test.ts` (+7): đúng MỘT call range với `startDate`/`endDate`, unwrap envelope, `403 → forbidden`, roster join thiếu tên → fallback ordinal `HS #n`. `attendance.mock.repository.test.ts` (9). `attendance-query-keys.test.ts` (5): key family `attendance-summary` disjoint với `attendance-history`/`history` ⇒ đổi `?range=` không thể refetch/invalidate tab Today/History (AC). |
| E2E / Story | `attendance-summary-tab.stories.tsx` (11 story): `Full` (4 StatCard, chip theo band scoped theo hàng, caption + `scope="col"`, `progressbar` mang `aria-valuenow`, thứ tự alerts risk→watch, không có "Báo PH"), `NoAlerts`, `SortByRate`, `RangeSwitch`, `NoTerms`, `RangeTooLarge`, **`InvalidRange` (mới)**, `Loading` (đúng 1 live region), `Empty`, `ErrorState`, `ErrorForbidden`, `Viewport375` (page không tràn 375px). **`attendance-summary-container.stories.tsx` (3 story mới, fix round)**: `NoTermsWithTermInUrl`, `FutureMonthInUrl`, `OversizeYearInUrl` — mock `nextjs.navigation.query` để test đúng đường URL→range mà story presentational không chạm tới được. `attendance-screen.stories.tsx` (+ args tab 3) giữ nguyên các story cũ xanh. |
| Platform | `bunx tsc --noEmit` clean · `bun vitest run` **590 files / 4993 tests xanh** · `bun vitest run --config vitest.storybook.mts` **172 files / 1405 tests xanh** · `bun run build` `✓ Compiled successfully` · `bun lint:fix` clean (còn 1 warning + 1 info có sẵn ở `messaging/message-context-menu.tsx`, không thuộc story này). Chưa curl range 1 HK qua Kong (stack chưa lên) — vẫn là mục Platform còn nợ, không chặn gate FE. |
| Release | Design-review gate + a11y do `fe-lead` đóng. `fe-accessibility-auditor`: **Pass** (1 minor A11Y-201, đã fix). |

### Fix round (sau review)

`fe-tech-lead-reviewer`: **Revision Required** — không có blocker security/architecture
(được ghi nhận là một trong những story "additive tab" sạch nhất epic), 3 SHOULD FIX +
bookkeeping. Đã fix hết:

1. **Notice sai nguyên nhân.** `resolveSummaryRange` trả `{type:"invalid-request"}` cho 4
   nguyên nhân khác nhau, container gộp tất cả thành copy "vượt quá 366 ngày" ⇒ `?month=2027-01`
   (tháng tương lai) bị bảo đi "chọn phạm vi ngắn hơn". Fix theo hướng (a): domain trả
   `InvalidSummaryRange { type:"invalid-request"; reason: "too-large" | "invalid-selection" }`
   (`type` giữ nguyên nên vẫn là một `AttendanceFailure` hợp lệ) + `isInvalidRange()`;
   `SummaryNotice` thêm `invalid-range` với key i18n riêng `attendance.summaryTab.invalidRange`
   (vi + en). Proof: 3 test domain mới + story `InvalidRange` + `FutureMonthInUrl` /
   `OversizeYearInUrl` (mỗi bên assert copy của mình VÀ assert vắng mặt copy của bên kia).
2. **`?range=term` khi không đọc được lịch.** Container coerce
   `effectiveKind = noTermsDegrade ? "month" : rangeKind` sau khi query terms đã settle rỗng,
   nên segmented luôn có item được chọn và luôn có control phụ; notice `no-terms` vẫn hiện để
   giải thích việc đổi (không im lặng). Proof: story `NoTermsWithTermInUrl`.
3. **`initialsOf` trùng 2 file.** Hoist sang `attendance-summary-tab/student-initials.ts`,
   `summary-table.tsx` + `alerts-panel.tsx` import từ đó (dedupe trong cùng thư mục màn hình,
   không phải vi phạm decision `0026`).
4. *(consider)* Bỏ 2 cast `terms[0]?.startDate as string` trong `yearRange` bằng guard
   `const first = terms[0]; if (!first) return { type: "no-terms" }`.

`fe-accessibility-auditor`: **Pass with 1 minor** — **A11Y-201**: nút sort cột "Tỉ lệ" có
`min-h-11` nhưng không bảo đảm bề rộng ⇒ thêm `min-w-11 px-1` cho ngang bằng các control khác
trong tab (≥44×44).

Không đụng (theo yêu cầu review): posture reject-not-truncate cho range >366 ngày (giữ nguyên,
nhất quán `ListAttendanceHistoryUseCase`) và cách suy ra "hôm nay" theo UTC (convention toàn repo).

### Harness Delta còn nợ

Ask BE: (a) endpoint thông báo PH về chuyên cần (nút "Báo PH" cố ý không render);
(b) TEACHER đọc `academic-years`/`terms` (hiện fallback month-only khi 403/empty).


### Design-review gate (fe-lead, `docs/DESIGN_REVIEW.md`)

- **Design-system conformance**: pass. Raw-color/anti-pattern grep across every touched file in
  `attendance-summary-tab/*.tsx` + `attendance-screen.tsx` — zero hits (no hex, no `gray-`/`slate-`,
  no side-stripe borders, no gradient text). No unguarded new transitions introduced (grep for
  `transition` in the new tab returns nothing — `ProgressBar`'s existing `motion-safe:`-gated
  transition, reused unmodified from US-E24.6, is the only motion in this tab). Component reuse
  confirmed by `fe-tech-lead-reviewer` (no invented primitives — `ProgressBar`/`StatCard`/
  `StatusBadge`/`ListError`/`ListSkeleton`/`ToggleGroup`/`Select`/`Table`/`Avatar` all reused as-is).
- **Accessibility**: pass — `fe-accessibility-auditor` verdict PASS with 1 minor (A11Y-201, sort-button
  touch-target width) — closed in the fix round (`min-w-11 px-1` added). Semantic `<table>` +
  `<caption>` + `scope="col"`, status never color-alone (StatusBadge tone + text label), zero-record
  rows read sensibly to a screen reader (distinct "0" vs "Chưa có buổi điểm danh nào" sr-only text),
  segmented control ≥44×44px, keyboard-operable sort toggle with `aria-sort`, forbidden state
  correctly omits (not disables) the retry button. Today/History tabs' existing a11y properties
  confirmed unaffected (purely additive `TabsTrigger`/`TabsContent`).
- **`/impeccable audit`**: same pre-existing gap as US-E24.6 (`NO_PRODUCT_MD`, `/impeccable init` never
  run repo-wide — tracked since E07.1, out of scope here). Manual scoped audit against the skill's
  "Absolute bans" checklist (side-stripe borders, gradient text, glassmorphism, identical-card grids,
  uppercase eyebrows, numbered-section scaffolding, container overflow) on every touched file — 0
  findings. No `critique`/`polish` run — this extends the already-shipped `design-spec.jsonc#screens.attendance`
  entry with a new `summaryTab` sibling key rather than introducing a new screen concept.
- **States & responsive**: pass — loading/empty/error(forbidden, no-retry)/success covered by
  Storybook (`full`/`no-alerts`/`empty`/`error`/`loading`/`no-terms`/`InvalidRange`/`RangeTooLarge`/
  `NoTermsWithTermInUrl`/`SortByRate`); `Viewport375` story genuinely asserts no horizontal overflow
  (`getBoundingClientRect().width <= 375`), not a cosmetic snapshot — the exact gap class US-E24.6's
  A11Y-101/102 found is proactively closed here. Dark mode not separately re-verified (no new
  hardcoded colors to break existing token-driven theming).

```
Design review: pass
- design-system: conform (token/typography/component OK)
- a11y: WCAG AA OK (1 minor closed in fix round); keyboard OK; reduced-motion OK (no new motion)
- impeccable audit: manual scoped audit (init prerequisite unmet, pre-existing gap), 0 findings
- states: loading/empty/error/success OK; responsive 320/375px OK; Today/History regression-safe
```


### QA gate (fe-qa-playwright)

**Verdict: GO.** 100% AC coverage independently verified by reading test files, not self-reports.
Found one genuine gap: AC "đổi lớp giữ range" (part of AC-4) had zero test coverage anywhere — code
was structurally correct (both `AttendanceFilters.update()` and `AttendanceSummaryContainer.update()`
build from the same shared `useSearchParams()` string) but nothing proved the composition. Closed
with a new story `ClassChangePreservesSummaryRange` in `attendance-screen.stories.tsx` — drives the
real class `<Select>`, asserts the pushed URL retains `range=term`. Also independently re-verified:
the `>366`-day rejection proves zero wire calls (not just a returned failure value), the differentiated
`too-large`/`invalid-selection` notices have both positive AND negative assertions in both directions,
and the no-terms URL-coercion path is genuinely tested. Final re-run after the QA addition:
`bun vitest run` 590/4993 green (pre-merge), `bun vitest run --config vitest.storybook.mts`
172/1406 green (pre-merge, +1 from QA's story), `bun run build` clean.

### Post-merge gate rerun (fe-lead, after `git merge origin/main` picking up US-E24.13)

`bunx tsc --noEmit` clean; `bun vitest run` **593 files / 5014 tests** green; `bun vitest run --config
vitest.storybook.mts` **173 files / 1422 tests** green; `bun run build` compiled successfully. No
conflicts in the merge (auto-merged `messages/{vi,en}.json` cleanly against US-E24.13's additions).

### Design-review gate (fe-lead, `docs/DESIGN_REVIEW.md`)

- **Design-system conformance**: pass. Raw-color/anti-pattern grep across every touched file in
  `attendance-summary-tab/*.tsx` + `attendance-screen.tsx` — zero hits (no hex, no `gray-`/`slate-`,
  no side-stripe borders, no gradient text). No unguarded new transitions (only `ProgressBar`'s
  pre-existing `motion-safe:`-gated transition, reused unmodified from US-E24.6). Component reuse
  confirmed by `fe-tech-lead-reviewer` (no invented primitives).
- **Accessibility**: pass — `fe-accessibility-auditor` PASS with 1 minor (A11Y-201, closed in fix
  round). Semantic `<table>` + `<caption>` + `scope="col"`, status never color-alone, zero-record rows
  read sensibly to a screen reader, segmented control ≥44×44px, keyboard-operable sort with
  `aria-sort`, forbidden state omits (not disables) retry.
- **`/impeccable audit`**: same pre-existing `NO_PRODUCT_MD` gap as US-E24.6 (tracked since E07.1, out
  of scope here). Manual scoped audit against the "Absolute bans" checklist — 0 findings.
- **States & responsive**: pass — loading/empty/error(forbidden,no-retry)/success covered by
  Storybook; `Viewport375` genuinely asserts non-overflow via real measurement.

```
Design review: pass
- design-system: conform (token/typography/component OK)
- a11y: WCAG AA OK (1 minor closed); keyboard OK; reduced-motion OK (no new motion)
- impeccable audit: manual scoped audit (init prerequisite unmet, pre-existing gap), 0 findings
- states: loading/empty/error/success OK; responsive 375px OK; Today/History regression-safe
```

