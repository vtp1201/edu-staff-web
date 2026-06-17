---
name: project-e09-discipline
description: E09 Discipline/Conduct epic status — US-E09.1 + US-E09.2 implemented; E09.3 planned
metadata:
  type: project
---

US-E09.1 Discipline Screen (teacher/principal) — implemented 2026-06-17.
- Routes: `/teacher/discipline`, `/principal/discipline`
- 3-tab screen: Vi phạm (Violations) + Hạnh kiểm (Conduct) + Nghỉ phép (Leave)
- Mock-first (core BE not shipped); feature module `src/features/discipline/`
- ADR 0040: `--edu-error-dark` (#b91c1c) + `--edu-error-dark-light` (#fee2e2) for "Nặng" severity
- Pattern used: RSC-props + local-state + Server Actions (not TanStack Query client — matches class-log)
- 425 vitest tests (86 files); 9 Storybook stories; tsc clean; build green
- Nav entry: Scale icon, labelKey `shell.nav.discipline`, teacher + principal roles

US-E09.2 Student Conduct Screen (student + parent) — implemented 2026-06-18.
- Routes: `/student/conduct`, `/parent/conduct`
- Extends `src/features/discipline/` domain with 4 student-scoped repo methods + 4 use-cases
- New use-cases: submit-leave-request (validates reason ≥10 chars, date ≥ today), get-my-conduct-summary, get-my-violations, get-my-leave-requests
- New failure types: `invalid-date`, `reason-too-short`
- New `SubmitLeaveRequestInput` interface in leave-request.entity.ts
- Presentation: `presentation/student-conduct-screen/` — StudentConductScreen + 4 sub-components
- i18n namespace: `discipline.studentConduct.*` (full vi+en); `shell.nav.conduct`
- A11Y: 7 findings fixed (A11Y-001–007) — contrast via `--edu-text-secondary`, form focus-on-error, role="alert" removed from static content, aria-live loading, min-h-11 touch targets, Sheet close i18n, landmark h2+progressbar label
- 436 vitest tests (88 files); 7 Storybook stories with play(); design-review 19/20 PASS
- Button primitive updated: `min-h-11` added to default size for WCAG 2.5.5
- Sheet primitive updated: `closeLabel` prop added for i18n close label

**Why RSC-props pattern:** mock-first with no cacheable remote data — consistent with E09.1 and class-log.

**How to apply:** US-E09.3 (Staff Leave Management) is independent — new feature module `src/features/staff-leave/` (do NOT add to discipline feature). The discipline domain is shared and stable; avoid modifying IDisciplineRepository for unrelated features.

Remaining in E09 epic:
- US-E09.3 (Staff Leave Management) — new independent feature; admin/principal manage teacher leave requests; independent of E09.1/E09.2

ADR 0040: severity dark-red token pattern — if another feature needs "critical/serious" severity, reuse `--edu-error-dark` pair.
