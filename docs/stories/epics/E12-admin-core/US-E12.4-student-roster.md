# US-E12.4 Student Roster — Class Enrollment Management

## Status

planned

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

—
