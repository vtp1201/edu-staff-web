# Epic E09 — Discipline, Conduct & Leave

## Summary

Quan ly ky luat hoc sinh, hanh kiem, va nghi phep. Giao vien ghi nhan vi pham
va quan ly yeu cau nghi phep (hoc sinh / phu huynh); hoc sinh xem hanh kiem ca
nhan va gui don xin nghi; admin/hieu truong quan ly nghi phep giao vien (E09.3).
Phu thuoc vao E12 (class management, student roster) va BE core service (mock-first).

## Design Source

- `design_src/edu/discipline.jsx` — 1506 handoff (DR-005 cuoi cung)
- Route giao vien: `/teacher/discipline` (DisciplineScreen — 3 tabs)
- Route hoc sinh: `/student/conduct` (StudentDisciplineScreen)
- Route admin: `/admin/staff-leave` (StaffLeaveScreen)

## Scope

| US | Screen | Roles | BE | Design |
| --- | --- | --- | --- | --- |
| E09.1 | Discipline Screen: Violations + Conduct + Leave tabs | teacher, principal | core mock-first | `discipline.jsx` |
| E09.2 | Student Conduct Screen: view conduct + leave request form | student, parent | core mock-first | `discipline.jsx` (StudentDisciplineScreen) |
| E09.3 | Staff Leave Management | admin, principal | core mock-first | `discipline.jsx` (STAFF_LEAVE_REQUESTS) + `staff-leave.jsx` |

## BE Dependencies

- `core` service — discipline endpoints (violations, conduct-points, leave requests) — mock-first (BE not yet built)
- `noti` service — parent notification on violation record (fan-out via SSE)
- All endpoints planned, not yet in openapi.yaml

## Domain Rules (from design)

- Severity: low = -1 pt, medium = -3 pt, high = -5 pt (from 100 baseline)
- Conduct grades: Excellent >= 90, Good >= 70, Average >= 50, Poor < 50
- Leave status pipeline: pending -> approved | rejected
- Staff leave types: annual / sick / personal / family
- Notify-parent pipeline: record violation -> generate parent notification via noti service

## Notes

- US-E09.1 is the teacher-facing full discipline management screen
- US-E09.2 is the student/parent self-service view
- US-E09.3 covers admin/principal approval of staff leave requests (distinct from student leave in E09.1)
- All screens mock-first; real BE wiring deferred to E06 follow-up stories
