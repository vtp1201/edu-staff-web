---
name: flaky-storybook-principal-classes
description: principal-classes-screen.stories.tsx sort-select story flakes intermittently in the Storybook vitest suite — re-run before blaming a branch
metadata:
  type: project
---

`src/features/principal/presentation/classes/principal-classes-screen.stories.tsx`
(~L586–589: open the sort Select, `await expect(option).toBeVisible()`, then
`{Escape}`) fails intermittently under
`bunx vitest run --config vitest.storybook.mts`. Observed 2026-08-07: run 1 =
1 failed / 1220 passed, immediate re-run = 1221 passed, on a branch that does
not touch that file.

**Why:** Radix Select portal timing — the assertion is not wrapped in a
`waitFor`/`findBy*` retry.

**How to apply:** if the Storybook suite reports exactly one failure in that
file, re-run before calling it a regression, and check whether the branch under
review touches `principal/` at all. Worth a standing SHOULD-FIX to `fe-lead`
(swap `getBy*` for `findBy*`) since it can also break the pre-push gate.
