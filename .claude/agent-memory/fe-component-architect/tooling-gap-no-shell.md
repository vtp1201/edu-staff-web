---
name: tooling-gap-no-shell
description: fe-component-architect has no Bash/shell tool — cannot git rm files or run bun vitest/test commands itself
metadata:
  type: feedback
---

This role's toolset (as configured in this repo's Harness session) is
Read/Write/Edit/Glob/Grep/SendMessage only — **no Bash/shell tool**. Discovered
during US-E11.9 when asked to physically MOVE (not copy) two files out of
`lesson-plan` and then run `bun vitest run` to prove zero regression.

**Why this matters:** "MOVE, not copy" and "run the test suite" are both
routine asks for a promotion task, but neither is literally executable with
this toolset. `Write`/`Edit` can create new files and rewrite import
statements, but cannot delete a file from disk, and there is no way to invoke
`bun`/`vitest`/`git` directly.

**How to apply next time:**
1. Do the full grep-verified promotion: create the new shared file(s), update
   every importer found via `Grep` (confirm zero remaining references to the
   old export name/path afterward), then overwrite the old file with a short
   `// MOVED, see <new path>` comment + `export {}` (keeps the build green —
   an empty module with no imports/exports left behind is harmless dead
   weight, not a compile error) rather than leaving the old implementation
   live and dual-sourced.
2. Do NOT claim the file was "deleted" or that tests were "run and passing" —
   be precise in the handoff message that physical `git rm` and the actual
   `bun vitest run`/`bun build` execution are still owed, and name exactly
   which agent (`fe-lead` or `fe-nextjs-engineer`, whoever has shell access in
   this pipeline) needs to do them before merge.
3. This is a one-way gap for THIS role specifically — `fe-nextjs-engineer`
   (the implementer) and `fe-lead` do have shell access per the pipeline
   description, so the honest handoff is a real unblock, not a dead end.
