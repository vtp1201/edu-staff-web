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
