---
name: project-us-e153-principal-schedule-plan
description: US-E15.3 principal member-schedule plan — picker-split decision, TimetableView prop-widening, get-member-timetable use-case shape
metadata:
  type: project
---

Plan written into `docs/stories/epics/E15-schedule-views/US-E15.3-principal-member-schedule/US-E15.3-principal-member-schedule.md` (`## Implementation Plan`).

Key findings/decisions:
- `IWeeklyTimetableRepository.getByMember` is real (US-E18.26), role-agnostic — principal
  calling it with a teacherId needs zero new BE/repo/DTO work, only a thin
  `get-member-timetable.use-case.ts` wrapper (no roster-validation, unlike the parent's
  `GetChildTimetableUseCase` which validates against `getChildren()` first — principal's
  picker source and fetch source are the same list, so double-validation is dead code).
- `TimetableRole` was `"student" | "parent"` only; extending to add `"principal"` requires
  widening `TimetableView`'s internal `isParent` gate (which currently controls BOTH the
  picker AND week-nav visibility) to a role-set check — this is a shared-component prop
  surface change, not just a new leaf file → flagged for `fe-component-architect`.
- Picker-split decision (decision `0026` tree applied): built a NEW sibling
  `teacher-picker.tsx` instead of generalizing `child-picker.tsx` into `member-picker.tsx`.
  Rationale: `TimetableChild` has a documented name-fallback gap (ask #20 residual) +
  color-identity avatar scheme that `PrincipalTeacher` (always has `displayName`, has
  `status: ACTIVE|ON_LEAVE` instead) has no equivalent need for — forcing one generic
  component today means more indirection than the ~50-line component it replaces. Promote
  to shared only on a 3rd caller (YAGNI). See [[project-us-e151-timetable-view-plan]] and
  [[project-us-e152-teacher-schedule-plan]] for the sibling module's history
  (`cellVariant="teacher"` seam from E15.1, reused here unchanged for principal viewing a
  teacher's per-class-name slots).
- `GetPrincipalTeachersUseCase`'s `Result<T,E>` convention (`.value`/`.failure`) differs
  from the timetable feature's own `TimetableViewResult` (`.data`/`.error`) — mapping code
  in the new Server Action must bridge the two shapes explicitly, easy to get backwards.
