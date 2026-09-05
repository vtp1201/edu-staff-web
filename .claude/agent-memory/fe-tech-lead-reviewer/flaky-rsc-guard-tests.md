---
name: flaky-rsc-guard-tests
description: Repo-wide vitest flakiness in RSC page.test.ts guard cases + di tests — pre-existing at baseline, never blame the branch without a baseline run
metadata:
  type: project
---

`bun vitest run` on the full suite intermittently reports 20–50 failures across
totally unrelated features (feed, admin/*, principal/*, teacher/*, student/*,
`bootstrap/di/*.di.test.ts`). They are 5s **timeouts**, not assertion failures, and
the recurring shape is the `"rejects a non-<role> ..."` / `"defaults to ..."` RSC
guard cases in `page.test.ts`.

**Why:** load/transform starvation (a full run shows transform ~260s, tests ~510s).
Repeating the SAME files gives a different failure set each run, and a clean run
passes 100%.

**How to apply:** before attributing any suite failure to the branch under review,
reproduce at the merge-base. `git worktree add <scratch> <merge-base>`, symlink the
branch's `node_modules`, run the same file list twice. On US-E24.5 the baseline
failed 2/17 on run 1 and 0/17 on run 2 — proving flakiness, not regression. Remove
the scratch worktree with `git worktree remove --force` + `git worktree prune`.

Scope-limited runs are the reliable signal: run the feature's own folders
(`src/features/<x>` + its route dir) a few times and require one fully green run.
Distinct from [[flaky-storybook-principal-classes]], which is a single named story.
