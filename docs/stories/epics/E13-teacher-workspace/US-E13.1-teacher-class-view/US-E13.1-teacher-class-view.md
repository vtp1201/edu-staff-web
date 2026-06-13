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
