---
name: project-e24-2-student-courses-v2
description: US-E24.2 student courses v2 implementation — degrade pattern, a11y round, QA gaps closed
metadata:
  type: project
---

US-E24.2 (student course cards, "sắp đến hạn" + "N mục đang mở") implemented and merged
(`3b7500f8`, worktree `us-e24.2`). Part of the E24 student sequence
(E24.2 → E24.3 → E24.5 → E24.4) run in a dedicated worktree, parallel to a teacher-branch
`/fe` session (E24.7→...→E24.10).

**Why record this**: recurring patterns useful for E24.3/E24.4/E24.5 (same feature module).

- `ListCoursesWithSummaryUseCase` (Promise.allSettled N+1 fan-out, `openCount: number | null`
  distinguishing unknown-vs-zero) is the accepted interim shape until BE ask #4 (`courses/me`
  summary) ships — E24.3/E24.4 should follow the same per-course-degrade pattern rather than
  inventing a new one.
- Teacher name is NOT resolvable from a student-callable endpoint (`CourseSummary.createdBy` is
  a memberId only) — confirmed data-availability gap, not a bug. E24.3's `courseHeader` design-spec
  block also names a teacher line — it will hit the same wall; don't reinvent, just omit.
- **First a11y round on this epic caught 3 blocking + 1 major + 1 minor** on a card that looked
  compliant in its own JSDoc: focus ring clipped by parent `overflow-hidden` (needs
  `ring-inset` whenever a focusable child fills a parent with `overflow-hidden`), status
  conveyed by colour alone despite shared icon/label, and a token used outside its own
  documented contrast envelope (`text-edu-warning-text` docs itself "large/bold ≥14px only" —
  reviewer/engineer both missed a 10px usage). Check all three again on every future course-card
  reuse in E24.3/E24.4/E24.5.
- QA gate found 4 AC lines that were previously proven only by static class-name assertions
  (44px touch target, focus-ring-not-clipped, keyboard tab/Enter, 320px overflow) — closed with
  real-browser Storybook interaction stories (`getBoundingClientRect`, `getComputedStyle`,
  `page.viewport()`, `userEvent.tab()`). Brief QA explicitly to replace static checks with real
  ones for these specific AC categories going forward, not just re-read existing tests.
- PUBLISHED badge removed from student course cards (DRAFT-only kept) — confirmed against
  `StudentCoursesV2` mockup (no badge on a normal card at all). Don't re-add it in E24.3/E24.4.
- Harness DB (`harness.db`) is gitignored and per-checkout — update it from the MAIN checkout,
  not the worktree (worktree has no `harness.db`, needs `scripts/bin/harness-cli` copied in
  manually and `init`, which is unnecessary extra work). For TEST_MATRIX.md (a tracked shared
  file), edit-and-revert-in-main-then-apply-patch-in-worktree keeps the edit atomic with the
  branch's commits instead of landing as an unrelated main-checkout diff.
- Both `bun vitest run` (unit+integration) and `bunx vitest run --config vitest.storybook.mts`
  should be run explicitly by fe-lead before push, not just trusted from engineer/reviewer
  self-report — the pre-push hook re-runs them anyway but running them first avoids a 2-minute
  Bash-tool timeout surprise (pre-push gate can exceed the default 120s; pass a longer
  `timeout` param and `NEXT_PUBLIC_USE_MOCK=` explicitly to `git push`).
