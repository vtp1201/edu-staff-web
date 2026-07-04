---
name: us-e17.4-qa-patterns
description: discipline empty states QA — router-hook storybook env failure is broader than previously recorded (includes discipline), gap-story pattern for shared EmptyState call sites
metadata:
  type: project
---

US-E17.4 (canonical EmptyState across violations/conduct/leave tabs + parent
leave history, DR-010/UX-01).

**Correction to a prior baseline note:** an earlier session's context claimed
"17 unrelated `useRouter`-mount failures env-wide in timetable/announcements/
etc, NOT discipline". That is now stale/wrong — `discipline-screen.stories.tsx`
IS among the router-invariant-failure set (`DisciplineScreen` calls
`useRouter()`/`usePathname()`/`useSearchParams()` from `next/navigation`, same
class of failure as `TimetableScreen`, `announcements-screen`, etc). Confirmed
by running the full `bunx vitest run --config vitest.storybook.mts` (no path
filter) and diffing the FAIL list — this file appears in ALL 10 of its stories
failing with `invariant expected app router to be mounted`, pre-existing and
unrelated to any diff (reproduces identically whether or not new stories are
added). **Lesson: don't trust a stale "known baseline" claim in a task prompt
verbatim — re-verify by running the full suite and comparing FAIL lists.**

**Shared-component migration coverage gap pattern:** when 4 call sites migrate
to reuse one new shared component (`EmptyState`), the shared component's own
`.stories.tsx`/`.test.tsx` proves the component works, but each CALL SITE can
still lack its own empty-branch coverage. Found here: `ConductTab` had a
`ConductTab` story (populated) but no `ConductTab_Empty` story at all — a
real, silent AC gap (AC-02.1–02.4) despite the shared component being fully
tested. Same gap on the parent side: `ParentDisciplineScreen.stories.tsx` had
11 stories but none set `initialLeaveRequests: []` outside of the error-state
story (where the ternary short-circuits to error, never reaching empty) — so
the parent leave-history empty branch (AC-04.1–04.4) was completely unproven.
**Check pattern: grep each call site's `.stories.tsx` for an explicit
`[]`-args story reaching the empty ternary branch — don't assume "the shared
component is tested" implies "every consumer's empty path is exercised".**

**Ternary-exclusivity as AC-05 (state-machine) proof:** both
`discipline-screen.tsx` (top-level `isLoading` / `loadErrorKey` / populated
ternary gating which tab components even mount) and
`ParentDisciplineScreen.tsx` (`isLoading` / `sectionErrorKey` / populated
ternary wrapping `LeaveHistorySection`) are exclusive `if`/ternary chains with
no shared-state overlap — provable by code reading alone, no new test needed,
consistent with the [[us-e17.5-qa-patterns]] precedent.
