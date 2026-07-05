---
name: us-e17.1-qa-patterns
description: US-E17.1 responsive stat-grid QA — story fixture must match the conditional branch that renders the target grid; Tabs unmount inactive panels
metadata:
  type: project
---

QA on a "pure CSS class swap ×8 files" story still found 2 real gaps by actually
running `bun vitest:storybook run <file>` (not just trusting the node-env
class-lock unit tests):

1. **Fixture/branch mismatch**: `exam-result.tsx` has TWO stat grids — a
   `sm:grid-cols-3` grid rendered for a final Pass/Fail result, and the
   auto-fit-migrated grid rendered only inside `PendingEssayResultView`
   (`!isResultFinal(result)`). The `Viewport375` story used `passResult` (a
   final result) so the migrated grid never mounted — `querySelector('[class*="auto-fit"]')`
   returned null and the assertion was vacuously unreachable. Fixed by
   switching args to `MOCK_PENDING_ESSAY_RESULT`. **Lesson: when a component
   has multiple grid containers gated by different render branches, verify the
   story's fixture actually reaches the branch containing the grid under
   test — don't assume "the fixture has stat data" is enough.**

2. **Tabs unmount inactive panels**: `discipline-screen.stories.tsx`'s
   `Viewport375` story only covered the Violations tab (the default
   `initialTab`) because Radix `Tabs` unmounts inactive `TabsContent` — the
   Conduct tab's grid (AC-10) was never rendered by any story despite a
   comment claiming "AC-10/AC-11" coverage. Added `Viewport375_ConductTab`
   with `initialTab: "conduct"`. **Lesson: a comment citing an AC number is
   not proof — check what `initialTab`/tab state the story actually mounts.**

Both gaps only surface by running the real-browser storybook runner
(`bun vitest:storybook run <file>`); the node-env `responsive-stat-grid.test.ts`
string-lock tests (grep for class presence in source) can't catch either —
they don't render anything. Confirms [[storybook-runner-env-issue]] pattern:
discipline-screen is in the known 17-file pre-existing `useRouter`-mount
failure set (see US-E17.4/E17.7 notes) — my new Conduct-tab story is
correctly written but can't go green until that infra gap is fixed; verify by
checking ALL stories in the file fail identically (not just the new one) to
confirm pre-existing vs. a real regression.
