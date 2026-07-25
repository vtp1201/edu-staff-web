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
| E09.5 | Staff Discipline: staff-violations + staff-conduct-notes tabs (ApprovalTransition, `selfApproved` fallback) | principal (author+approve), teacher (self-view) | core `conduct` sub-domain — real routes ground-truthed (US-E18.14), mock-first client (roster-UUID gap, asks #9/#22) | `staff-discipline.jsx` (DR-022, ADR `0062` route fix) |
| E09.6 | Student Absences: per-date excused/unexcused record + one-way admin flag | teacher (record/edit, own class), principal (flag-only, schoolwide) | core `conduct` sub-domain — real routes ground-truthed (US-E18.14), mock-first client (roster-UUID gap, asks #9/#22) | `student-absences.jsx` (DR-022, ADR `0062` route fix) |

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
- US-E09.5/US-E09.6 (added 2026-07-25, DR-022) are a distinct product/design
  gap found by US-E18.14's BE ground-truthing: `staff-violations`,
  `staff-conduct-notes`, `student-absences` are real, fully-shipped `core`
  conduct sub-resources with zero prior web screen. Unlike E09.1-E09.3 (whose
  BE endpoints are still only planned), these two stories' underlying BE
  routes/DTOs/error codes are already ground-truthed against Go source — only
  the web client is mock-first, blocked by the cross-repo roster-UUID gap
  (asks #9/#22), not by BE non-existence.
- ADR `0062`: both DR-022 screens' routes were corrected from `(app)/admin/*`
  to `(app)/principal/*` (+ `(app)/teacher/staff-discipline` self-view) — the
  mockups' own role checks use `role === 'principal'`, and the strict
  `(app)/admin/layout.tsx` guard (decision `0022`/`0024`) would otherwise
  redirect a principal actor away before the screen ever renders.
- All screens mock-first; real BE wiring deferred to E06/E18 follow-up stories
