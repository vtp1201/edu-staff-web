# US-E24.8 Class detail shell — tab theo vai trò + deep-link từ dashboard & lịch tuần

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E24.7 (`roles` trên `TeacherClass`)
- Blocks: US-E24.9, E24.10, E24.11 (mỗi tab)
- Feature module(s) chạm: route `teacher/classes/[classId]/page.tsx` (mới) + `students/page.tsx`
  (→ redirect `?tab=students`), `features/teacher/presentation/class-hub/**` (mới),
  `teacher-dashboard-home` (href shortcuts), `features/timetable/presentation/teacher-schedule`
  (cell → Link)
- Shared contract/file: `messages` `teacher.classHub`; đổi nhãn i18n "Tiết học" → "Thời khoá biểu"
  (key `teacher.classHub.tabs.timetable`). `nav-config.ts` KHÔNG đổi.

## Product Contract

Design v3: `class-hub.jsx` → `ClassHubScreen` (breadcrumb, header, tabs), `app.jsx`
`navParam {classId, tab}`; `teacher.jsx` dashboard rows + `TeacherScheduleFull` cells clickable.

- Route `/teacher/classes/[classId]?tab=students|timetable|course|homeroom` (URL = state; default
  `students` nếu GVBM, `homeroom` nếu chỉ GVCN). Tab không hợp lệ/không được phép (homeroom khi
  không phải GVCN) → về default.
- Breadcrumb "Lớp học › Lớp 10A1"; header card: icon, "Lớp 10A1", `RoleBadges`, "36 học sinh ·
  Năm học 2025–2026".
- Tabs (`role=tablist`, Link-based): Học sinh · Thời khoá biểu · Khoá học online · Chủ nhiệm (GVCN).
  US này chỉ dựng shell + tab **Học sinh** = roster hiện có (`teacher-class-students-screen`) nhúng
  làm tab; 3 tab còn lại render placeholder "Đang xây dựng (US-E24.9/10/11)" — placeholder có test
  và bị thay ở US tương ứng.
- `/teacher/classes/[classId]/students` → `redirect(...?tab=students)` (giữ deep-link cũ).
- Deep-link: dashboard "Tiết sắp dạy" rows → `/teacher/classes/[classId]?tab=timetable`; "Bài chờ
  chấm" → `?tab=students`; `/teacher/schedule` mỗi ô tiết có lớp → `?tab=timetable` (cell = Link,
  hover tint, focus ring). Cần `classId` thật trong VM schedule (hiện có `className`? — nếu chỉ có
  tên lớp, thêm `classId` vào entity `ScheduleItem` từ `SlotResponse.classId`).
- Tab Học sinh header theo vai trò (design `ChStudentsTab`): GVBM "Điểm môn X của tôi" + nút "Nhập
  điểm X" → `/teacher/grades?classId=`; GVCN "Toàn cảnh lớp (GVCN)" chỉ đọc. Cột điểm chi tiết theo
  design (Miệng/15'/1 tiết/TB) **không** làm ở đây — roster hiện tại giữ cột hiện có; ghi backlog
  E24.17 "students tab grade columns (US-246 draft)".

## Relevant Product Docs

- `docs/product/design-spec.jsonc#teacher-class-hub`; `docs/product/screens.md`
- `docs/stories/epics/E13-teacher-workspace/US-E13.1-teacher-class-view/*` (roster hiện tại)

## Acceptance Criteria

- `/teacher/classes/10A1` (GVCN+GVBM) → 4 tab; lớp chỉ GVBM → 3 tab; `?tab=homeroom` trên lớp không
  GVCN → fallback default (page test).
- `/teacher/classes/[id]/students` redirect 308 → `?tab=students` (test).
- Dashboard row click → đúng URL (story interaction); schedule cell là `<a>` có href đúng.
- Tab hiện tại `aria-selected`, điều hướng bằng bàn phím (arrow keys optional; Tab/Enter bắt buộc).
- Nhãn tab "Thời khoá biểu" (không còn "Tiết học") trong vi; en "Timetable".
- Lớp không tồn tại/không phải lớp của tôi → `notFound()`.
- Storybook: shell-both-roles / subject-only / placeholder tabs; mobile: tabs wrap.
- Gate xanh; design-review + a11y.

## Design Notes

- Queries: `getMyClass(classId)` (mới trên repo teacher: lọc từ `listMyClasses` hoặc `GET classes/{id}`
  + roles) → VM `ClassHubHeaderVm`.
- UI: `class-hub/{class-hub-screen.tsx, class-hub-header.tsx, class-hub-tabs.tsx, tab-placeholder.tsx}`;
  tab content là RSC con theo `searchParams.tab` (không client fetch).
- Redirect helper: cùng pattern E24.4.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | tab resolver (roles × param → tab), href builders |
| Integration | page tests (tabs, redirect, notFound) |
| E2E | Storybook shell + dashboard/schedule link stories |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

Backlog item E24.17 (students tab grade columns) — `harness-cli backlog add`.

## Evidence

(điền sau)
