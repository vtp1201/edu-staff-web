---
name: project-gender-badge-promotion
description: GenderBadge lives in admin-roster feature; must be promoted to components/shared/ when teacher roster uses it
metadata:
  type: project
---

`GenderBadge` component currently at:
`src/features/admin-roster/presentation/student-roster-screen/components/gender-badge.tsx`

If teacher roster (`TeacherRosterTable`) needs the same component, this is the second use → per component-organization rule (decision 0026), it must be MOVED (not copied) to `src/components/shared/gender-badge/` with `index.ts` + `.stories.tsx`. Both admin-roster and teacher roster then import from `components/shared/gender-badge`.

**Why:** Prevent duplication of gender display logic across features.
**How to apply:** Engineer implementing TeacherRosterTable must grep for GenderBadge and promote if reused.
