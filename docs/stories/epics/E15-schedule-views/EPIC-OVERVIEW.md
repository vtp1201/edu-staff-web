# Epic E15 — Schedule Views (Consumer Read-only)

## Goal

Cung cấp màn hình xem thời khoá biểu chỉ đọc cho **học sinh, phụ huynh và giáo viên** —
consume TKB đã được BGH xếp qua TimetableBuilder (US-E12.5 / admin). Không có edit affordance.
Tách riêng khỏi Epic E13 (teacher-workspace) / E14 (academic-records) để gom mọi consumer
schedule view về một epic (quyết định 2026-06-19).

## Scope

| Story | Title | Status |
|-------|-------|--------|
| US-E15.1 | Timetable Read-only View (Student + Parent) | planned |
| US-E15.2 | Teacher Schedule View (lịch dạy cá nhân) | planned |

## Out of Scope

- TimetableBuilder (admin xếp TKB) → thuộc Epic E12 (US-E12.5).
- Conflict detection → admin-only, không xuất hiện trong consumer view.

## Dependencies

- E12 (US-E12.5) — TimetableBuilder tạo TKB; E15 consume kết quả.
- `core` service (BE) — mock-first cho đến khi service ship.

## Design Source

`edustaff_5/edu/timetable-view.jsx` (ADR 0044 — edustaff_5 handoff 2026-06-19).
