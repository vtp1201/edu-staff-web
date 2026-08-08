---
name: project-e18-60-e08-8-lms-mock-role-switcher
description: US-E18.60 (force-mock LMS student consumption, ADR 0073) + US-E08.8 (remove RoleSwitcher header pill) both implemented 2026-08-08/09; race-commit recovery pattern and a second concurrent session independently resolving the same finding
metadata:
  type: project
---

Both US closed same session, fully merged to `main`: US-E18.60 (pin
`lms.di.ts#makeRepo()` to `MockLmsRepository` unconditionally — `lms` BE is a
scaffold, only `/health` exists, ADR 0073, precedent 0054) and US-E08.8
(delete mock-era `RoleSwitcher` header pill, superseded by the real
tenant-switch dialog from US-E23.1; `role` in `AppShell` becomes a plain
`const role = initialRole` derivation, no more client-side role mutation).

**Race-commit recovery, live**: at session start, the shared checkout was on
`feat/us-e08.7-student-schedule-nav-label` with a stray unpushed commit
(`docs(reports): ask #51 …`) sitting on top of that branch's rightful commit —
a live instance of the documented shared-working-tree race
([[feedback-concurrent-agent-file-collision]], decision 0033's risk). Fix
used: save the whole state as a throwaway local branch (`git branch
tmp-lms-ask-holder`), then `git checkout` that holder branch, then `git
branch -f <real-branch> <rightful-commit-sha>` to move the branch pointer
back. Pointer-moves via `branch -f` are also the safer tool in a shared
working tree — they never touch another session's uncommitted files, unlike
history-rewriting resets.

**A second concurrent session found and fixed the SAME finding
independently**, mid-way through my own work: while I was mid-review-cycle on
US-E18.60, `origin/main` gained a *directly-pushed* commit
(`c68b5ead docs(reports): ask #51...`) — bypassing the branch/claim workflow
entirely, docs-only. It carried the exact same LMS-scaffold ask content I'd
independently re-authored (from the recovered stray commit) inside the
`docs/lms-ask-51`-tagged effort I never saw directly, only its `main` landing.
Wording differed slightly (mine cited `US-E18.60`/`ADR 0073` explicitly, since
those didn't exist yet when the other session wrote its version). Result: an
add/add merge conflict on `docs/reports/2026-08-08-fe-to-be-asks-lms.md` when
merging `origin/main` into my `feat/us-e18.60-*` branch — resolved by keeping
my version (more complete, correct citations), trivial. Lesson: when a stray
race-commit surfaces, ANOTHER concurrent session may already be independently
converging on the identical fix from a different angle — don't assume you're
the only one holding the recovery; expect a merge collision on the shared doc
artifact and just take the more-complete side.

`git branch -d`/`fe-worktree rm` refused deletion of the branch-per-US local
refs even after `git merge --no-ff` into `main`, because they still track
their own (unmerged-into-*that*-remote) `origin/feat/...` upstream — `git
branch --merged main` DOES show them merged; the refusal is upstream-tracking
noise, not a real safety signal. Use `git branch -D` once `--merged main`
confirms it, then `git push origin --delete` both.

`fe-worktree` script's local `main` ref inside a spawned worktree is stale
from creation time — a background reviewer/engineer diffing `main...HEAD`
inside its own worktree will misattribute files from branches merged to
`origin/main` *after* the worktree was created. Always diff against
`origin/main...HEAD` (after a fresh `fetch`) inside a worktree, not local
`main`.
