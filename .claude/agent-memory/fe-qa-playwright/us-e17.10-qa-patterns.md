---
name: us-e17.10-qa-patterns
description: StatCardSkeleton/TableRowSkeleton QA — RSC loading.tsx has no Storybook coverage by design, discipline-screen baseline useRouter failure confirmed pre-dates the story, minor AC-14 test-file gap closed
metadata:
  type: project
---

US-E17.10 (loading skeletons, DR-011 §UX-05): clean PASS, no defects.

**RSC `loading.tsx` Suspense fallbacks (teacher/student dashboards) cannot have
Storybook interaction stories** — they're `async function Loading()` server
components using `getTranslations` (next-intl server API), not renderable in
the client-side Storybook browser runner. Proof for these two files is
source-text vitest lock only (`count={6}`/`count={4}`, `StatCardSkeletonGrid`
import, `getTranslations` + `skeleton.loadingAriaLabel` present) — this is the
correct/only proof tier for this file shape, not a coverage gap to flag.

**`bun run vitest:storybook run discipline-screen` failing 15/15 with
`useRouter` "invariant expected app router to be mounted" is the pre-existing
17-file baseline** ([[us-e17.4-qa-patterns]], [[us-e17.8-qa-patterns]]) — confirmed
again by `git show <parent-commit>:discipline-screen.tsx | grep useRouter`
showing the `useRouter()` call pre-dates this story (landed in US-E17.1,
`a2dbe4a`). This story's diff never touches that import. Don't re-litigate;
just cite the parent-commit grep as proof it's not a regression instead of
re-running the whole suite on `main` in a worktree (cheaper technique when the
call site clearly pre-dates the diff — no worktree needed, just `git show
<parent-sha>:<file> | grep <symbol>`).

**`teacher-dashboard-home.stories.tsx` also has 3 pre-existing failures**
(`Default`/`All Stats`/`Pending Grades Detail`, ambiguous `getByText("23")`
multi-match) unrelated to skeletons — confirmed via `git diff <parent>..HEAD
--stat -- <dir>` showing zero diff to that file in this story's commits.

**Genuine minor gap found and closed:** `stat-card-skeleton.test.ts` (the
shared component) had no negative raw-color assertion for AC-14, while the
sibling `table-row-skeleton.test.ts` did (same story, same AC, inconsistent
test rigor across the two new skeleton files). Added the same
`not.toMatch(/#[0-9a-fA-F]{3,6}/)` + `not.toMatch(/(bg|text|border)-(gray|slate|zinc|neutral)-\d/)`
pair to close it — cheap, consistent with the existing pattern, worth adding
(not busywork) since AC-14 previously rested on manual code review for this
file only. 1029→1030 after the add.

**Evidence-in-story.md pattern reinforced:** when `story.md`'s "Evidence"
section documents a deviation as already reviewed/approved by tech-lead (e.g.
count=4 not spec's "3", `bg-accent` not `bg-muted`), QA should verify the
underlying claim (grep the real screen's card count / grid class) rather than
re-flagging the literal AC wording as a defect — the story.md AC list itself
had already been edited to match the approved deviation.
