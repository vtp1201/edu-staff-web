---
name: component-placement
description: Canonical component placement decisions and promotion triggers established in US-E13.1
metadata:
  type: project
---

## Component placement patterns

**GenderBadge:** Originally feature-local in
`features/admin-roster/presentation/student-roster-screen/components/gender-badge.tsx`.
Promoted to `components/shared/gender-badge/` in US-E13.1 because TeacherRosterTable
is the second consumer. Promoted API: `femaleLabel: string` + `maleLabel: string` props
(removes hardcoded `useTranslations("adminRoster")`). Both callers inject translated strings.

**RosterPagination pattern:** Admin `RosterPagination` is tightly coupled to `adminRoster`
i18n namespace. Teacher screen uses a private `TeacherRosterPagination` sub-function
in the same file. Promote to `components/shared/` only when a third screen needs it OR
when admin is refactored.

**Admin RosterBreadcrumb vs TeacherRosterBreadcrumb:** NOT shared. Admin breadcrumb is
a dropdown class-switcher (DropdownMenu). Teacher breadcrumb is a static trail (nav>ol>li).
Different patterns — each stays feature-local.

**Disabled action buttons with Tooltip:** Use `<button disabled aria-disabled="true">`
wrapped in `<Tooltip>`. Radix Tooltip wires `aria-describedby` automatically. No custom
aria wiring needed.

**ClassCard stays feature-local** at `features/teacher/presentation/teacher-classes/components/`.
Promote to `components/shared/` only when a second screen (e.g., principal class list)
needs the same card pattern.

## Promotion trigger rule (component-organization.md)
- Same pattern used by 2 screens = promote to `components/shared/`.
- Promote = MOVE (not copy). Update all import paths.
- Feature-local composed = `features/<x>/presentation/<screen>/components/`.
- Always grep `components/ui`, `components/shared`, `features/*/presentation` before
  proposing a new component.
