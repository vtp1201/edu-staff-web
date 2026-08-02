---
name: feedback-concurrent-session-shared-files
description: How to handle dirty working-tree files from a concurrent /fe session when merging your own branch
metadata:
  type: feedback
---

When another /fe session is active, the working tree may contain untracked feature files (e.g. `src/features/admin/timetable/`) and modifications to shared files (`bootstrap/i18n/messages/*.json`, `bootstrap/di/index.ts`, `bootstrap/endpoint/index.ts`).

**Why:** Multiple /fe sessions run in the same local checkout. A concurrent session may have uncommitted WIP that blocks `git checkout main`.

**How to apply:**
1. Before `git checkout main`, run `git status --short` to spot dirty files.
2. If only `src/bootstrap/i18n/messages/` files are modified (concurrent team added i18n keys): `git stash push -m "timetable-wip-preserve" -- src/bootstrap/i18n/messages/en.json src/bootstrap/i18n/messages/vi.json` then do your checkout+merge, then leave the stash (the concurrent team will pop it or redo it).
3. If modified tracked files belong to another team's feature: stash them by path.
4. NEVER `mv` or `rm` untracked files that belong to another session — that removes the concurrent team's uncommitted work.
5. After your push is done, check if the stash is still needed before popping it.
6. Note: the pre-push `bun build` runs TypeScript over ALL files on disk including untracked ones. If concurrent untracked files reference missing i18n namespaces, the build will fail. In that case, check if those files have a matching committed stash entry with i18n keys to pop, or whether the concurrent team already committed the i18n keys.

**Recurrence (2026-08-02, US-E20.4/E20.5, dead-sidebar-links batch):** the same
pattern hit twice more, this time with foreign changes across
`src/features/auth/infrastructure/*`, `src/app/[locale]/(auth)/select-tenant/*`
(OAuth clientId work) and an untracked `docs/reports/*.md`. Refined approach
that worked cleanly: (a) commit ALL of your own intended files first via
explicit `git add <path>` (never `-A`) so anything left unstaged is
unambiguously theirs; (b) then `git stash push -u -m "temp: ..."` with **no
pathspec at all** — safer than trying to quote bracket/paren directory names
(`[locale]`, `(auth)`) which breaks zsh globbing; (c) run your push/build/merge
on the now-clean tree; (d) do NOT manually pop it back — checked `git stash
list` afterward and the "temp:" entries had already vanished (their session
reclaimed it on its own timeline, no coordination needed, no data lost). If a
build still fails after stashing everything foreign, retry once before
investigating further — this repo also has a known ~1/1000 `test-storybook`
flake in the pre-push hook, unrelated to concurrent-session contamination.
