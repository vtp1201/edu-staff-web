# US-E12.5 Timetable Builder — Weekly Schedule with Conflict Detection

## Status

planned

## Lane

normal

## Product Contract

Admin/BGH xây dựng thời khoá biểu tuần: mỗi slot (ngày × tiết × lớp) gán
giáo viên + môn học + phòng. Hệ thống tự detect conflict khi một giáo viên được
assign hai slot trùng (cùng ngày + tiết). Slot conflict hiển thị badge đỏ; click
mở editor để resolve bằng cách đổi giáo viên hoặc xóa slot.

BE story: US-045 (timetable with conflict detection, ADR 0029 — TeachingAssignment).

## Relevant Product Docs

- `design_src/edu/timetable.jsx` — **pixel reference** (route `/admin/timetable`,
  US-045, ADR 0029)
- BE API (mock-first):
  - `GET  /api/v1/core/timetable?classId=&yearId=`
  - `PUT  /api/v1/core/timetable/slots/:slotId`
  - `DELETE /api/v1/core/timetable/slots/:slotId`
  - `GET  /api/v1/core/timetable/conflicts?classId=&yearId=`

## Acceptance Criteria

- Route `app/[locale]/t/[tenant]/(app)/admin/timetable/page.tsx`.
- Class selector + academic year selector.
- Weekly grid (Mon–Sat × N periods). Filled slot: subject badge + teacher name +
  room. Empty slot: dashed placeholder "Thêm".
- Click slot → SlotEditor panel: subject select → teacher select (filtered to
  teachers with TeachingAssignment for that subject + class, per ADR 0029) → room
  input → Save / Clear.
- Conflict detection: conflict badge (red) on slot if teacher already assigned in
  another class at same (day, period). Conflict summary panel listing all conflicts.
- "Xuất PDF" button (mocked — placeholder toast).
- Mock-first (DI); vitest unit cho conflict-detection algorithm.
- Design review pass.

## Design Notes

- Design file: `design_src/edu/timetable.jsx`.
- Teacher select filter: chỉ show teachers có `TeachingAssignment` cho môn học +
  lớp đang chọn (quy tắc từ ADR 0029 — xem mock data `TT_TEACHERS` trong
  timetable.jsx).
- Conflict visual: `error/15` bg + error color border + conflict icon top-right.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | conflict detection algorithm (same teacher, same day+period, different class) |
| Integration | assign slot → conflict appears; resolve → conflict clears |
| E2E | — |
| Platform | `bun build` xanh |
| Release | design-review gate pass |

## Role Guard

Route `/admin/timetable` — chỉ role `admin` (decision `0022`).

## Harness Delta

—
