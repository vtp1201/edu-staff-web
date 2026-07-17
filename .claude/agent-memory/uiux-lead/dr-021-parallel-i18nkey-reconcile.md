---
name: dr-021-parallel-i18nkey-reconcile
description: DR-021 lesson-plan+question-bank — running designer+ux-writer fully in parallel causes i18nKey annotation drift in design-spec.jsonc; lead must reconcile before merge
metadata:
  type: feedback
---

DR-021 (Lesson Plan Authoring + Question Bank, US-E18.16 design follow-up)
bundled two net-new screens under one DR (justified: same finding #27, zero
file/branch contention, precedent DR-014/DR-018). Ran `uiux-designer` and
`uiux-ux-writer` fully in parallel (disjoint files: `design_src/edu/*.jsx` +
`design-spec.jsonc` vs `messages/{vi,en}.json`) — this is safe for merge
conflicts but **not** for content coherence: the designer wrote `i18nKey`
annotations in `design-spec.jsonc` *guessing* what shape the writer's keys
would take (e.g. `lessonPlan.title.mine / .school`, `questionBank.searchGate.title`),
while the writer independently chose flat/differently-nested keys
(`lessonPlan.title` + `subtitleBrowse`, `questionBank.requiredFilterPrompt.title`).
Neither agent was wrong per their own instructions — the mismatch is a
structural consequence of parallel execution with no shared draft.

**Fix applied**: after both complete, the lead must grep every `i18nKey`
annotation in the new `design-spec.jsonc` entries and diff it against the
actual landed `vi.json`/`en.json` keys (fast way: `python3 -c "import json;
print(json.dumps(vi['<namespace>']))"` then eyeball vs each annotation).
Also surfaced 2 genuinely *missing* keys the designer's UI needed but the
writer's DR-scoped pass hadn't anticipated (a scope-toggle control, a
mandatory-filter satisfied/required indicator) — these were small, additive,
non-controversial, so the lead added them directly to both `vi.json`/`en.json`
post-hoc rather than re-running the writer, then re-verified vi/en leaf-key
parity with a Python leaf-counter and updated `i18nKeyCount` in the spec.

**For future multi-screen/parallel DRs**: either (a) have the designer write
its `i18nKey` guesses AFTER reading the writer's actual output (sequential,
safer but slower), or (b) keep them parallel for speed but budget lead time
to reconcile every `i18nKey` annotation string against the real JSON before
declaring the design-review gate passed — don't just trust each agent's
self-report of "no collision."

**Also confirmed**: `bun build` is NOT `bun run build` — bare `bun build`
invokes bun's own bundler (`error: Missing entrypoints`) instead of the
`package.json` `"build": "next build"` script, because `build` collides with
bun's reserved subcommand. Always use `bun run build` for the gate check.

**Also confirmed (recurring)**: other teams' sessions leave uncommitted
`.claude/agent-memory/<team>/*.md` edits in the working tree that block
`git pull --ff-only`/checkout across branches. Safe fix: `git stash push -u`
before switching branches/pulling, `git stash pop` after — never `git
checkout --`/discard them, they're not yours to touch.

Related: [pipeline-conventions](pipeline-conventions.md),
[DR-020 net-new pattern](dr-020-net-new-pattern.md).
