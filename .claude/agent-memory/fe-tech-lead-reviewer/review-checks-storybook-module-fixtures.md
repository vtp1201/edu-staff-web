---
name: review-checks-storybook-module-fixtures
description: Module-level mutable fixtures in .stories.tsx (accumulating arrays / stateful stores) can go false-green on re-run — check them whenever a story proves "the action was called with X"
metadata:
  type: feedback
---

When a `.stories.tsx` declares mutable state at **module scope** and a `play`
function asserts against it, grade the determinism before accepting the proof.
Two shapes, very different risk:

- **Accumulating array + `toContain`** (e.g. `const seen: Filter[] = []` filled
  by a fake action, asserted `expect(seen).toContain("unread")`) → **fail-silent**.
  On any second execution in the same worker the array still holds the previous
  run's entries, so the assertion passes even if the click did nothing. Require
  a per-story array (build it inside `play`, or via `args` from a `beforeEach`)
  or assert on a `fn()` spy's calls instead.
- **Stateful store mutated by the fake** (e.g. `store.items` flipped to
  `read: true`) → **fail-loud**: the re-run starts from the mutated state and the
  query blows up. Annoying, not dangerous. Still ask for a reset.

**Why:** `.claude/rules/tdd.md` requires deterministic tests (no run-order
dependence). `vitest.storybook.mts` configures **no** `retry`, so today these are
latent, not active — which is exactly why they slip through a green run and only
bite later when someone adds `--retry` or uses watch mode.

**How to apply:** grep the story file for `const` declarations between `meta` and
the first `export const`. A stateful fixture is sometimes the RIGHT call (a
mark-read story needs the refetch after `onSettled` to return the mutated row, or
a stateless fixture hides a real optimistic-update bug) — so ask for a reset, not
for the statefulness to go away. Non-blocking on its own.

Related: [[flaky-rsc-guard-tests]], [[flaky-storybook-principal-classes]].
