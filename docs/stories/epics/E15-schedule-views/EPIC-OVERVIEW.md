# Epic E15 — Schedule Views (Consumer Read-only)

## Goal

Cung cấp màn hình xem thời khoá biểu chỉ đọc cho học sinh và phụ huynh — consume
TKB đã được BGH xếp qua TimetableBuilder (US-E12.5 / admin). Không có edit affordance.

## Scope

| Story | Title | Status |
|-------|-------|--------|
| US-E15.1 | Timetable Read-only View (Student + Parent) | planned |

## Out of Scope

- TimetableBuilder (admin xếp TKB) → thuộc Epic E12 (US-E12.5).
- Teacher schedule view (giáo viên xem lịch dạy của mình) → TBD (có thể US-E15.2).
- Conflict detection → admin-only, không xuất hiện trong consumer view.

## Dependencies

- E12 (US-E12.5) — TimetableBuilder tạo TKB; E15 consume kết quả.
- `core` service (BE) — mock-first cho đến khi service ship.

## Design Source

`edustaff_5/edu/timetable-view.jsx` (ADR 0044 — edustaff_5 handoff 2026-06-19).
