---
name: us-e17.5-qa-patterns
description: grade-book empty state QA — dual role="status" disambiguation, ternary-exclusivity as valid AC proof, PASS gate for small presentation-only diffs
metadata:
  type: project
---

US-E17.5 (canonical empty state on grade-book-screen + mobile scroll completions
on the shared `GradeBookTable`, DR-011 UX polish). Clean PASS, no gaps filled.

**Dual `role="status"` disambiguation pattern:** when a screen has BOTH a legacy
`role="status"` element (e.g. old dashed-border `EmptyState`/no-selection prompt)
and a new canonical `role="status"` pattern, a bare `getByRole("status")` can't
tell them apart if both were ever rendered simultaneously (they aren't here —
mutually exclusive ternary — but the *test* still needs to prove that). This
repo's convention: assert on `className` (`.not.toContain("dashed")` for
canonical, `.toContain("dashed")` for legacy) rather than trying to add a
`data-testid`. Good, reusable pattern — check for it before flagging "ambiguous
role" as a defect.

**Ternary/if-else exclusivity as legitimate AC proof:** AC-01.10/11/12 (loading/
error/success states must NOT render the empty-state container) don't need a
dedicated negative assertion in every story if the source structurally uses a
single `if/else if` chain with no shared render path — verify via code read
(not just grep) that the branches are truly exclusive, then treat each state's
OWN story (`Loading`, `ErrorState`, `TeacherView_WithScores`) as sufficient
proof by construction. Don't demand redundant `queryByRole` absence checks in
every branch story when the code makes coexistence impossible.

**Role-parity AC (e.g. "same empty state renders for all 5 roles") is safely
proven by code review alone** when the component under test takes no `role`
prop and has no role-conditional JSX — don't require a story per role just to
re-assert an identical DOM tree with a different fixture value; that's marginal
test value, not risk reduction. Reserve per-role stories for behavior that
actually branches on role (see [[us-e17.2-qa-patterns]] "MobileScroll" stories
which DO branch on role for the publish-gate banner).

**Verify NFR "zero new tokens/i18n keys" claims directly, don't trust the
story.md prose:** `git diff main -- src/app/tokens.css src/bootstrap/i18n/messages/{vi,en}.json`
— empty diff is fast, authoritative proof; cheaper than re-deriving it from
code review.

**E2E judgment call:** for a normal-lane, presentation-only, no-new-route,
no-form diff (conditional-render swap + CSS class rename), Storybook `play()`
via `@vitest/browser-playwright` (real Chromium) IS sufficient E2E-equivalent
proof — no separate Playwright spec needed. Reserve dedicated E2E for
cross-page journeys, forms, or auth/role-routing changes.
