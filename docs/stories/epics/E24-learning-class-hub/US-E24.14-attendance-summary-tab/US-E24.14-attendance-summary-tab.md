# US-E24.14 Tab "Tổng hợp chuyên cần" (teacher attendance tab 3) — range Tháng / Học kỳ / Cả năm, 4 StatCard, bảng theo HS + chip Đạt/Cảnh báo/Nguy cơ

## Status

planned

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

## Evidence

(chưa có — planned)
