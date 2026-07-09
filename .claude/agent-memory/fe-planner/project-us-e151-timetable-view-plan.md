---
name: project-us-e151-timetable-view-plan
description: US-E15.1 timetable read view plan — new features/timetable module, subject-color token gap (Địa lý #946000), endpoint/session-resolution decisions
metadata:
  type: project
---

Plan written into `docs/stories/epics/E15-schedule-views/US-E15.1-timetable-read-view/story.md`
(## Implementation Plan, 4 phases). Key reusable findings for future timetable/schedule work
(US-E15.2 teacher view will extend this same module):

- `features/timetable/` is a brand-new module (was empty), deliberately separate from
  `features/admin/timetable` (the builder) — own domain entities (`WeeklyTimetable`/
  `TimetableSlot` with resolved names, not raw FK joins), own endpoint file
  (`bootstrap/endpoint/timetable-view.endpoint.ts`, NOT the admin builder's existing
  `timetable.endpoint.ts`), own DI file (`timetable-view.di.ts`), own i18n namespace
  (`timetableView`, sibling to admin's `timetable` namespace).
- **Subject-color token gap**: admin builder (`features/admin/timetable/presentation/
  timetable-screen/timetable-static.ts`) already hardcodes 10 raw hex subject colors and
  renders them as raw inline styles — pre-existing tokens-only violation, out of scope to fix.
  9 of the 10 hexes map exactly onto existing `--edu-*` tokens (primary/purple/success/warning/
  error/teal/info/text-muted/primary-dark); only Địa lý `#946000` has no token — flagged as
  ADR-candidate (next NNNN ≥0051) for future `/fe` sessions on this epic.
- **No centralized "current user's classId / parent's children" resolution exists anywhere**
  (`requireRole()` only decodes role from JWT, no userId/claims). `features/grades`'
  `GetChildListUseCase` already solves this the same way (hardcoded mock roster, no session
  scoping) — this story follows the same pattern scoped inside `features/timetable/`, flagged
  as a cross-feature consolidation candidate once BE `core`/`iam` ship real "my profile"/
  "my children" endpoints (grades + timetable + future attendance all need this).
- Parent child-picker is a NEW card-style component (`child-picker.tsx`), explicitly NOT the
  tab-based `ChildSwitcher` from `features/grades` — different visual pattern per design spec,
  feature-local until a 2nd screen needs the card variant.
