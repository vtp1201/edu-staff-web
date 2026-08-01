---
name: us-e18.28-qa-patterns
description: exam-bank edit/delete BE wiring QA — RSC route-wiring gap pattern recurs even when the pure policy fn is unit-tested; delete-confirm-flow-to-completion often missing; tech-lead's own non-blocking CONSIDER is worth closing, not just noting
metadata:
  type: project
---

US-E18.28 (exam-bank `updateExam` diff-sync + `deleteExam` real wiring, core
US-152) was a genuinely clean US — tech-lead round 2 APPROVED, only 4
test-coverage gaps found, zero production defects. Patterns:

1. **Unit-testing a pure policy function (`resolveBuilderAccess`) is NOT the
   same as testing the RSC route that calls it.** `[id]/edit/page.tsx` wired
   `USE_MOCK` + `decodeSubClaim(token)` + the loaded `ExamBankDetail` into that
   function and branched on the result — none of that wiring had a test before
   this gate, only the 6-case unit test of the function in isolation. Same
   blind spot recurred for `teacher/exam-bank/page.tsx`'s JWT-`sub`
   teacher-id resolution (which the story's own "Engineer decisions" section
   flagged as load-bearing — without it, real-mode ownership gating is dead
   code — yet still had zero test). Recipe: mock `@/bootstrap/lib/mock`
   (`{ USE_MOCK: bool }`) + DI module + `auth-token.server`/`jwt` +ally the
   sibling `./actions` module, `vi.resetModules()` + dynamic `import("./page")`
   per test, call the exported function directly, inspect `el.type.name` /
   `el.props`. See `[[us-e11.8-qa-patterns]]`/`[[us-e13.8-qa-patterns]]` for
   the same class of gap on other USs.
2. **"The dropdown offers Delete" ≠ "the delete flow was ever driven to
   completion."** `exam-bank-screen.stories.tsx` had thorough menu-CONTENT
   assertions (owner-draft/owner-published/other-teacher) but no story ever
   clicked Delete → confirmed → asserted `deleteAction` called + card removed,
   for either mock or real mode. When adding it, the `DestructiveConfirmDialog`
   sets `aria-hidden` on the background while open — asserting `getAllByRole`
   on the canvas immediately after clicking confirm can throw ("no accessible
   roles") if the dialog hasn't closed yet; `await waitFor(() =>
   expect(dialog.queryByRole("alertdialog")).not.toBeInTheDocument())` before
   the post-condition assertion fixes it.
3. **A tech-lead's own "non-blocking CONSIDER" follow-up note is a real,
   closeable gap, not just a thing to re-mention.** Round 2 flagged
   `Builder_SaveDraftSucceedsWhenComplete` running with the completeness gate
   OFF, missing gate-ON+complete→saves (real mode's actual happy path). QA
   closed it with one new story rather than re-deferring it — when the fix is
   a one-line story-arg addition, close it in the QA pass instead of carrying
   it forward again.
4. **PATCH-skip-when-unchanged optimizations need BOTH asymmetric tests.**
   `updateExam`'s "skip PATCH when title+duration both unchanged" had a test
   for title-changed (send) and neither-changed (skip), but not
   duration-changed-only (send) — the mirror case that would catch a
   `&&`/`||` swap regression.
