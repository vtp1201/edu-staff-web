---
name: project-e09-discipline
description: E09 Discipline/Conduct epic status — US-E09.1 implemented; E09.2/E09.3 planned
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

**Why:** RSC-props pattern chosen over client TanStack Query because mock-first with no cacheable remote data — consistent with class-log reference.

**How to apply:** When building E09.2 (student conduct), `src/features/discipline/` already exists with domain entities + repo interface + mock fixtures. E09.2 extends the mock repo (adds student-scoped methods) and shares DisciplineFailure + endpoint constants.

Remaining in E09 epic:
- US-E09.2 (Student Conduct Screen) — depends on E09.1 domain + mock repo; feature module shared
- US-E09.3 (Staff Leave Management) — new feature `src/features/staff-leave/`; independent

ADR 0040: severity dark-red token pattern — if another feature needs "critical/serious" severity, reuse `--edu-error-dark` pair and promote to design-system.md.
