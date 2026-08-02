---
name: us-e18.33-qa-patterns
description: parent child-switcher/child-picker real-name wiring (IAM tiered batch lookup) — QA patterns and a real stale-comment find
metadata:
  type: project
---

US-E18.33 (grades ChildSwitcher + timetable ChildPicker real names via IAM
tiered `GET /members?ids=`, ADR-0120): tech-lead's 2 code fixes (dead
`GRADES_EP.childList` constant, stale page.tsx comment) and the
degradation-consistency fix (unresolved name → ordinal label not raw UUID;
missing class → `classPending` not blank) were all genuinely verified in code
+ a real non-vacuous story (`ParentView_RealMode_ResolvedNames` drives the
ACTUAL mapper, asserts `queryByRole(..., {name: /st-2/})` is null to prove no
raw uuid leaks into the accessible tab name).

**New finding this pass**: `parent-child-list.repository.ts` (grades) has 3
STALE doc comments (class docstring + 2 inline) still describing the
PRE-FIX "degrades every row to its raw memberId" fallback — the review-fix
commit (`e913e87`) touched the mapper/component/i18n/tests but never touched
this repository file, so its comments now assert the opposite of the shipped
behavior (name is omitted, not raw-id). Same *class* of defect the tech-lead
already caught once in this exact story (the page.tsx stale comment) — a
reminder that a stale-comment fix in one file doesn't guarantee siblings
describing the same old behavior got updated. Grep for the specific fallback
phrase (`raw memberId`, `raw-id fallback`) across ALL files touching a mapper
being changed, not just the ones in the fix commit's diff.

Also: `[[story-play-gap-pattern]]` continues to hold — "zero component/markup
change" in a story's own Validation table was factually wrong here (JSX WAS
edited to add the ordinal/classPending fallback rendering); harmless since the
change is text-only, not layout, but self-reported "no markup change" should
not be trusted literally — read the diff.

Storybook browser-mode suite showed a 1-test flake (unrelated Select/roster
dropdown test) on run 1, 0 failures on immediate rerun — confirms
`[[us-e17.2-qa-patterns]]`'s "browser runner works, but tolerate one flaky
rerun" precedent; always rerun once before calling a single failure a
regression.

TEST_MATRIX.md row and packet `## Status` were both still `planned` despite
complete Evidence/proof — same staleness pattern as `[[backlog-state]]`;
flag for fe-lead to sync post-QA, don't treat as a blocker by itself.
