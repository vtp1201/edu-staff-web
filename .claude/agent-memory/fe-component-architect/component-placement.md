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

**OtpInput (US-E22.1):** promoted `features/auth/presentation/forgot-password/otp-input.tsx`
→ `components/shared/otp-input/otp-input.tsx` on 2nd call site (`EmailVerifyDialog`).
Composed-but-primitive-ish shared component → plain co-located `OtpInputProps` interface
in the `.tsx` file, NOT a separate `.i-vm.ts` (that's reserved for screen/container
server↔client contracts; `OtpInput` is a controlled, non-container component — same
class as `StatusBadge`, which also inlines `StatusBadgeProps` with no `.i-vm.ts`).
Pattern for promoting a controlled input-like shared component: add optional
`digitAriaLabel`/`groupAriaLabel`-style i18n-injection props + `error`/`disabled` state
props, keep the original caller's behavior unchanged by leaving new props optional/undefined
at that call site (behavior-preserving move).

**StatusBadge tone vs literal design-spec color:** when a design-spec entry gives a literal
hex/token color (e.g. `var(--edu-teal)`) for a semantically "success"-like badge, check
`StatusTone` for a closer-hued existing tone (e.g. `"teal"`) before defaulting to
`"success"` — the union already has `primary/success/warning/error/info/purple/teal/muted`;
picking the closest literal-color tone over the semantically-obvious one is a one-word
implementation detail worth flagging to the reviewer, not a new component/token.

## Promotion trigger rule (component-organization.md)
- Same pattern used by 2 screens = promote to `components/shared/`.
- Promote = MOVE (not copy). Update all import paths.
- Feature-local composed = `features/<x>/presentation/<screen>/components/`.
- Always grep `components/ui`, `components/shared`, `features/*/presentation` before
  proposing a new component.
