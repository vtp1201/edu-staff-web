---
name: project-us-e152-teacher-schedule-plan
description: US-E15.2 teacher schedule plan — additive extension of features/timetable/ from US-E15.1, cellVariant seam already built ahead of time, stale design-spec entry found
metadata:
  type: project
---

Plan written into `docs/stories/epics/E15-schedule-views/US-E15.2-teacher-schedule-view/story.md`
(## Implementation Plan). Key findings, useful for any future work extending `features/timetable/`:

- US-E15.1 (see [[project-us-e151-timetable-view-plan]]) **already built the teacher seam ahead of
  time**: `TimetableGrid`'s `cellVariant: "class" | "teacher"` prop, `TimetableSlot.className?`
  (domain entity + DTO + mapper), and the `IWeeklyTimetableRepository` doc comment reserving
  `getByTeacher` — all pre-existed, no grid/entity/DTO/mapper change needed for US-E15.2. Only
  additive: `getByTeacher()` on the repo, `GetMyTeachingScheduleUseCase`, mock fixture, DI factory,
  a new lightweight `TeacherScheduleScreen` (deliberately NOT a third role-branch on the existing
  `TimetableView` — that component already carries parent-only concerns like child-picker/week-nav
  that don't fit teacher's simpler single-week self-scope).
- Reused `WeeklyTimetable`/`TimetableSlot` entities as-is for the teacher schedule (no new
  `WeeklyTeachingSchedule`/`TeacherScheduleSlot` entities) — top-level `classId`/`className` fields
  documented as holding teacherId/teacherName for this variant rather than forking a parallel shape.
- **Stale `docs/product/design-spec.jsonc` entry found**: `teacherScheduleFull` (keyed under a
  different section, sourced from legacy `design_src/edu/teacher.jsx`) describes a 5-slot grid with
  conflict-detection (`conflictCell`, `alertTriangle` tooltip) that contradicts US-E15.2's own AC2
  (no conflict panel) and the `edustaff_5/edu/timetable-view.jsx` baseline actually used. Flagged as
  a doc-sync item for fe-lead/uiux-docs-manager, not an ADR (no new token/architecture decision).
- Route pattern confirmed: `(app)/teacher/` segment already exists with many sibling routes, all
  using `requireRole(["teacher"])` from `src/bootstrap/auth-guard` in `actions.ts` — reuse directly,
  no new guard code for any future teacher-scoped read screen.
