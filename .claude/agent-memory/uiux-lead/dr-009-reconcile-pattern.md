---
name: dr-009-reconcile-pattern
description: DR-009 impeccable anti-pattern fixes — verify/merge/harness pattern for post-impeccable mockup retrofits
metadata:
  type: project
---

DR-009 (2026-06-21): post-impeccable audit retrofit of reference mockups.
Already-implemented check confirmed: all 14 changed files are design_src only (no src/).

Pattern: impeccable audit → uncommitted mockup changes in working tree → verify diff
genuinely useful → branch docs/dr-NNN-slug → stage by concern → commit per concern →
gate (vitest + bun run build) → merge --no-ff to main → push → delete branch.

**Why:** design-only changes (design_src/edu/*.jsx, design-spec.jsonc, rules) don't touch
src/ so Lefthook's biome/tsc/vitest-related hooks are all skipped on pre-commit; gate runs
on pre-push instead. No ADR needed if tokens already exist in tokens.css.

**How to apply:** Commit type `chore(design-mockup)` works. `design(...)` is not an
allowed conventional commit type — commitlint rejects it. Allowed types:
feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.

5 concerns registered as US-E16.1–E16.5 (planned) in TEST_MATRIX.md.
Prod file mapping fully documented in each US --notes for /fe to pick up.

Sync file for claude.ai design project lives at: design_src/CLAUDE_DESIGN_SYNC.md
(canonical home — design_src/ is the design team's workspace, not a parallel doc tree).
