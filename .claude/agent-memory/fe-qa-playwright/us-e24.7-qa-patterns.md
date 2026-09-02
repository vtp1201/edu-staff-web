---
name: us-e24.7-qa-patterns
description: QA findings for US-E24.7 teacher class-list-by-role screen (KPI tiles, dual-role badges)
metadata:
  type: project
---

US-E24.7 (`/teacher/classes`, GVCN/GVBM class list + draft-contract KPI tiles): self-report was
accurate for Storybook/mapper/repo layers, but the RSC route `page.tsx` — which owns `toTiles()`
(tone thresholds, "N+" cap suffix, pendingLeave>0 gate), the GVBM(`cls.kpi`)+GVCN(`homeroomKpi`)
merge incl. `demoFields` concatenation, and `fetchHomeroomKpis`'s homeroom-only fan-out via
`Promise.allSettled` — had **zero test file** (no sibling `page.test.ts`). Storybook stories only
exercise `TeacherClassesScreen` with hand-built VM objects; they never run this mapping logic.
This is the same recurring gap as [[us-e11.8-qa-patterns]] / [[us-e13.8-qa-patterns]] /
[[us-e18.26-qa-patterns]] — always check for a `page.test.ts` sibling when a route does
non-trivial VM assembly, even after a clean tech-lead APPROVED + a11y-closed status.

Closed with a new `page.test.ts` (9 cases): error-VM-on-list-failure, homeroom-only KPI fan-out
(subject-only classes never call `getHomeroomKpi`), dual-role tile merge + demoFields
concatenation, alertTone threshold (0 → neutral, >0 → warning/error), capped-count "+" suffix,
pendingLeave-only-when->0 gate, `kpi` key OMITTED (not empty tiles array) when nothing resolved,
a rejected `Promise.allSettled` KPI call degrading gracefully, and the 4-card AC scenario
(1 dual-role + 3 subject-only, roles/subjects/studentsHref passthrough). Recipe: `vi.mock` the DI
factory module + `next-intl/server`'s `getTranslations` (mirrors `admin/parent-links/page.test.ts`
and `teacher/exam-bank/page.test.ts`), `await import("./page")` per test, cast the returned React
element as `{ props: { vm } }`.

Everything else genuinely held up on inspection: mapper forge test (`homeroomTeacherId ===
memberId`, `sub` claim ignored) exists and is real; mock repo's accepted CONSIDER-6 (openViolations/
pendingLeave never get the "demo" pill even under global mock — only attendanceRate does) verified
by reading `mock-teacher-class.repository.ts` directly, matches what tech-lead recorded; 320px
reflow fix (A11Y-001) is a real `grid-cols-1 sm:grid-cols-[...]` Tailwind breakpoint (below `sm`
=640px collapses to 1 column, not just a class-name comment) — confirmed via source read, no
Storybook viewport story exists for it but the CSS mechanism itself is unambiguous (no need for a
browser-mode 320px probe here, unlike [[us-e17.1-qa-patterns]] where the fixture never mounted).
i18n vi/en parity for `teacherClasses.card.kpi.*` confirmed exact via direct JSON read.
