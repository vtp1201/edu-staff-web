---
name: project-roster-table-not-shared
description: Admin RosterTable is coupled to unenroll actions; cannot be shared to teacher read-only view without structural change
metadata:
  type: project
---

`src/features/admin-roster/presentation/student-roster-screen/components/roster-table.tsx` has hardcoded:
- Checkbox column for multi-select
- Unenroll button per row
- Bulk unenroll action bar
- `adminRoster` i18n namespace

It is NOT promotable to `components/shared/` until a read-only variant is also needed in admin. Per component-organization rule, create `TeacherRosterTable` as a feature-local component in `features/teacher/presentation/teacher-class-students/` first. Promote both to `components/shared/` (as `ReadOnlyRosterTable` + `RosterTable`) when admin also needs a read-only view.

**Why:** Component-organization rule (decision 0026) — promote on second use, not speculatively.
