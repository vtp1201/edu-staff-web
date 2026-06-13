# 0033 Worktree Isolation for Parallel FE Sessions (amends 0025)

Date: 2026-06-14

## Status

Accepted

## Context

Decision `0025` (Parallel FE Branch Workflow) isolates concurrent `/fe` sessions
by **branch** — one branch per US, claimed by early push. But it left a sharp edge:
all sessions ran in the **same working tree** (one checkout → one shared `HEAD` +
one shared index). Git's branch model does not isolate the working directory, so
when two sessions operate in the same checkout:

1. **Commits land on the wrong branch.** If session A switches branch (or even just
   has a different branch checked out) while session B runs `git commit`, B's commit
   lands on whatever branch `HEAD` currently points at. Observed **2026-06-14**:
   US-E06.8's entire 32-file / 1667-line staffing commit landed on an unrelated
   `chore/sync-matrix-*` branch created by another session. Recovered with a manual
   `git merge --ff-only` (no force needed) only because the parent was linear.
2. **Stash pile-up.** Sessions park each other's dirty files to get a clean branch
   → 8 stale stashes accumulated across the E12.x sessions.
3. **File bleed.** Untracked/modified files from one session ride along another
   session's `git checkout`, risking accidental commits of the wrong work.

The harness compounds this: shell state resets between tool calls, so the checked-out
branch can silently differ from what a session assumes.

## Decision

Amend `0025` with **git worktree isolation for parallel sessions** (enforceable
detail in `.claude/rules/parallel-workflow.md`):

1. **One worktree per US — but only when parallel.** When a `/fe` session detects
   concurrency at claim-check time (any other in-flight remote `feat/us-*` / `fix/*`
   branch exists) **or** the user signals parallel work, it MUST run that US in a
   dedicated git worktree. **Solo** work (no other in-flight branch) stays in the
   main checkout — no worktree overhead.
2. **Sibling location.** Worktrees live OUTSIDE the repo at
   `../<repo>-trees/<us-id>` (e.g. `../edu-staff-web-trees/us-e06.6`). Sibling, not
   in-repo, so Next.js / Biome / tsc / bun never scan a second tree and no
   `.gitignore` entry is needed.
3. **Helper script.** `scripts/bin/fe-worktree {add|rm|list|path}` encapsulates the
   lifecycle: `add` branches from `origin/main` **without touching the main checkout
   HEAD**, adds the worktree, runs `bun install` (node_modules is not shared across
   worktrees), and early-pushes the branch (the 0025 claim). `rm` removes the
   worktree and deletes the branch (local + remote) after merge.
4. **Branch lifecycle unchanged.** Claim-by-early-push, dev+test on the branch,
   auto-merge `--no-ff` to `main` on gate-green, delete branch — all per `0025`.
   Only the *where* (isolated dir) changes when parallel.
5. **Same-checkout safety net.** When (despite this) work happens in a shared
   checkout, ALWAYS `git branch --show-current` immediately before any commit, and
   after each run verify no commit landed on the wrong branch
   (`git log --oneline <intended-branch>..HEAD`).

## Alternatives Considered

1. **Always use a worktree (even solo).** Uniform and fully race-proof, but every
   US pays worktree-create + `bun install` overhead even with a single session.
   Rejected in favour of conditional use keyed off the claim-check that 0025 already
   performs.
2. **In-repo `.worktrees/<us-id>` + `.gitignore`.** Self-contained and easy to find,
   but Next/Biome/tsc/bun glob the repo and would scan the nested tree; requires
   careful excludes in several configs. Rejected for the sibling layout.
3. **Symlink `node_modules` into each worktree** instead of `bun install`. Faster,
   but breaks the moment a branch changes `package.json` (the infra/storybook branch
   did exactly that). Rejected as default; left as a manual opt-in.
4. **Keep shared checkout + discipline only** (verify branch before each commit).
   No new tooling, but relies on perfect discipline against a harness that resets
   shell state between calls — the very thing that caused the incident. Kept only as
   the §5 safety net, not the primary control.

## Consequences

Positive:

- Each parallel session has an isolated `HEAD`/index/working dir → the wrong-branch
  commit, stash pile-up, and file-bleed classes are eliminated by construction.
- `main` checkout is never disturbed by `fe-worktree add` (branch created from
  `origin/main` without checkout).
- One scripted lifecycle → less ad-hoc git, fewer mistakes.

Tradeoffs:

- A worktree needs its own `node_modules` (`bun install` per worktree) — extra
  setup time, mitigated by only using worktrees when actually parallel.
- Disk: one extra checkout + node_modules per concurrent US.
- Contributors must run sessions from the worktree dir, not the repo root, when
  parallel — documented in the rule + the script's usage banner.

## Follow-Up

- `.claude/rules/parallel-workflow.md` + `.claude/agents/fe/lead.md` updated to make
  the worktree step part of the claim lifecycle.
- If disk/`bun install` overhead becomes painful, revisit Alternative 3 (guarded
  module symlink with a `package.json`-hash check).
