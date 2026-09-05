---
name: flaky-storybook-principal-classes
description: Two Storybook stories (principal-classes sort-select, admin invitations dialog) flake under full-suite load — re-run the single file before blaming a branch
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

## Sibling flake: admin invitations (2026-09-05)

`src/features/admin/invitations/presentation/invitations-screen/invitations-screen.stories.tsx`
(~L543 `body.getByRole("dialog")` after asserting the listbox closed) fails the
SAME way: 1 failed / 1319 passed in the full suite, then 46/46 passed when the
file was run alone, on a branch (US-E24.9) that touches no `admin/` file.

Same root cause (un-retried `getByRole` against a Radix portal, worse under
full-suite load) and the same handling: re-run the single file before calling it
a regression, and check `git diff --name-only origin/main...HEAD` for the feature.
Both files want `findByRole`/`waitFor` — a standing SHOULD-FIX for `fe-lead`,
since either can redden the pre-push gate for an unrelated story.
