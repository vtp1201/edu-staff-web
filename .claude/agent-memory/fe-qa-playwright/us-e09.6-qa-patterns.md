---
name: us-e09.6-qa-patterns
description: QA patterns from US-E09.6 student-absences gate — real gap in listAbsences role re-check test coverage; mock-mode route-hint-as-role is a known cross-story pattern
metadata:
  type: project
---

US-E09.6 (student absences, teacher record/edit + principal one-way flag) QA pass findings.

**Real gap found + closed**: `MockStudentAbsenceRepository.resolveReadScope`'s `else throw
forbidden` branch (any role that is neither `teacher` nor `principal` calling `listAbsences`)
had ZERO test coverage across both `student-absence.mock.repository.test.ts` and its sibling
`.security.test.ts` — every existing `listAbsences` test only ever constructed a teacher or
principal repo. Added 6 new tests to the security file (`student`/`parent`/`admin` × with/without
an explicit `classId` request) — closes AC-001.6/AC-002.5's list-side backstop. Repository/
use-case layer had excellent record/edit/flag forbidden-role coverage already (both directly via
repo AND via use-case layer per AC-006.4's "not just UI-hidden" requirement) — the gap was
specifically the READ path, easy to miss because it's not framed as its own numbered AC (only
implied by the UC-006 security use case's spirit + AC-001.6/AC-002.5's "backstop" language).

**Pattern to check on every mock-first feature with role-scoped reads**: grep the mock
repository for every early-return/throw branch on `authCtx.role`, then confirm EACH branch
(not just the write-side ones spec'd as explicit ACs) has a direct test. Write-side (record/
edit/flag) forbidden-role tests are usually present because they map to a named AC; read-side
role denial often isn't.

**Mock-mode route-hint IS the auth context in dev/demo mode** — `resolveStudentAbsenceAuthContext`
(and the sibling staff-discipline/discipline resolvers before it) makes the ROUTE's
`mockRoleHint` fully override the real claim role whenever `NEXT_PUBLIC_USE_MOCK=true`. This
means in mock mode, navigating directly to `/teacher/absences` grants full teacher context
regardless of actual logged-in role — but real mode (`useMock=false`) deny-by-defaults
correctly (unknown/wrong claim role → non-teacher/non-principal → repo's role guard denies).
This is an established, reviewed, cross-story pattern (staff-discipline US-E09.5, discipline
US-E18.14) — not a new defect to flag per-story, but worth noting if a story ever ships with
`USE_MOCK` toggleable by end users (it currently isn't — dev/demo only).

**Solid patterns already in place worth reusing elsewhere**:
- `pending()` = `new Promise<T>(() => {})` (never settles) is the right way to prove "no
  optimistic update while mutation is in flight" — genuinely pending, not a resolved promise
  with a delay.
- AC-004.3-style "immutable field must never be *any* input, even disabled" is best proven by
  querying `querySelectorAll('input[type="date"]')`/`querySelectorAll('select')`/
  `queryByRole('combobox')` all return empty/null — checking static text presence ALONE is a
  false-positive risk (component could render text AND a hidden/disabled input).
- Two-independent-badge stories (excused/unexcused + flagged) should assert BOTH signals'
  counts explicitly from a 4-row fixture with all 4 combinations (RECORDED+excused,
  RECORDED+unexcused, FLAGGED+excused, FLAGGED+unexcused) — not just "renders without crashing".
- Responsive overflow assertions via `document.documentElement.scrollWidth <=
  document.documentElement.clientWidth + 1` are legitimate ONLY when the storybook interaction
  suite actually runs under a real browser (`@vitest/browser-playwright`), confirmed here via
  `vitest.storybook.mts`'s `playwright({})` provider — this is NOT vacuous in this repo.

**Process note**: `docs/TEST_MATRIX.md`'s US-E09.6 row was still `no|no|no|no|planned` at QA time
despite tech-lead approval + a11y fixes already landed — a stale-proof-flags gap for fe-lead to
close via `harness-cli story update` before/at merge, independent of the actual test-suite health
(112→118 unit/integration after this pass; 28 + 9 = 37 Storybook interaction tests all green;
`tsc --noEmit` clean).
