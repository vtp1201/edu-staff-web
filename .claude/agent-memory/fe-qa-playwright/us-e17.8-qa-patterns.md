---
name: us-e17.8-qa-patterns
description: DestructiveConfirmDialog shared component QA — real production defect found (confirmSendOpen never resets on success), env-baseline confirmation technique, gap-story patterns
metadata:
  type: project
---

US-E17.8 (canonical `DestructiveConfirmDialog` in `components/shared/`, 3 net-new
instances + 7-dialog consolidation, DR-011/UX-02).

**Real production defect found via QA-lens + browser interaction test (not
speculative):** `announcement-drawer.tsx`'s send-to-school confirm flow sets
`confirmSendOpen(true)` on click but the success path (`submit()` →
`onOpenChange(false)` closing the Sheet) never calls `setConfirmSendOpen(false)`.
The reset only lives in a `useEffect` gated `if (!open) return;` (only fires on
*reopen*, not on close) — so after every successful "Gửi ngay" the
`DestructiveConfirmDialog` (Radix `AlertDialog`, focus-trapped) is left mounted
`open=true` on top of the now-closed drawer. Confirmed by literally running the
Storybook interaction test and finding `role="alertdialog"` / `data-state="open"`
still in the DOM post-confirm — not a false positive from animation timing.
Compare: the sibling discipline delete-violation instance (`violations-tab.tsx`)
correctly calls `setDeleteTarget(null)` in its success branch — the announcements
instance is the one with the gap. **Lesson: when a shared component gets 2-3
net-new instance wirings, diff the success-path close logic across ALL instances
— one implementer can get the close-on-success right and another can miss it
for the exact same component.** Escalated as CRITICAL to fe-lead (QA does not
touch production code); the fix is a one-line `setConfirmSendOpen(false)` in
`submit()`'s success branch, but that's fe-lead/fe-nextjs-engineer's call.

**Pre-existing filtered-single-file-run false positives are real and must be
verified against `main`, per-file, before trusting them.** Ran
`bunx vitest run --config vitest.storybook.mts <file>` filtered to touched
files (`class-management-screen`, `exam-bank-screen`, `grade-approval-screen`,
`admin-settings-screen`, `discipline-screen`, `announcements-screen`) — all
showed failures. Checked out `main` in a sibling `git worktree`, ran the exact
same filtered command, and the failure list/count was byte-identical for
`class-management-screen`/`exam-bank-screen`/`grade-approval-screen`/
`admin-settings-screen` (pre-existing "sb-preparing-story"/multi-element-match
env quirks of the filtered runner, unrelated to this diff). Running the FULL
suite (no path filter) instead reproduces the documented 17-file `useRouter`
env baseline (`discipline-screen`, `announcements-screen`, `timetable`,
`class-management-screen`, `exam-bank-screen`, `grade-approval-screen`,
`admin-settings-screen`, `lesson-bank`, `messaging`, `notifications-center`,
`teacher-dashboard-home`, `teaching-plan`, `exam-builder`, `exam-taking`,
`staffing-departments`, `card`, `ParentDisciplineScreen`) — 17 failed / 76
passed files, 71/449 tests, matches [[us-e17.4-qa-patterns]]'s prior finding
that this baseline is broader than early sessions assumed. **Technique that
works: `git worktree add <scratch-dir> main` + `bun install` + rerun the exact
same filtered command on main, diff the FAIL list — don't just eyeball error
text similarity.**

**Coverage-split verification (Vitest node-env footer + Storybook browser
role/interaction) is real and sound** for the shared
`DestructiveConfirmDialog`: 8 Vitest tests on the extracted portal-free
`DestructiveDialogActions` prove aria-busy/disabled/variant/DOM-order; the
Storybook stories prove role=alertdialog, focus-on-open, Escape, click
call-counts. Added a 9th Storybook story (`TabCyclesFocusTrap`) — AC-11 (Tab
cycles focus only between cancel/confirm, Radix trap) had zero coverage
despite being an explicit spec AC; cheap to add (`userEvent.tab()` twice,
assert focus lands back on cancel).

**Shared-component migration coverage gap, again:** discipline's teacher-only
delete-violation flow (net-new for this story) had ZERO interaction-test
coverage — no story asserted the per-row `aria-label` (A11Y-005, "just fixed"),
the teacher-vs-principal button-visibility gate, the optimistic-removal
success path, or the error-toast path. `discipline-screen.stories.tsx`'s
`ViolationsTab_Teacher`/`ViolationsTab_Principal` stories only render statically
— no `play()` exercised the delete button at all. Added 3 stories
(`ViolationsTab_DeleteFlow`, `ViolationsTab_DeleteError`,
`ViolationsTab_Principal_NoDeleteButton`) closing this gap. Consistent with
[[us-e17.4-qa-patterns]]'s "shared component tested ≠ every call site's branch
tested" lesson — this time on a brand-new net-new flow, not an empty-state.

**7-dialog consolidation (FR-009/AC-24) had literally zero pre-existing
per-dialog tests to regress** — grepped `git show main:<path>.test.tsx` for
all 7 target files, none existed, and none of the 5 parent-screen
`.stories.tsx` had a play() that opened/clicked through the old dialogs either
(except `class-management-screen`'s `ArchiveWithWarningFlow`, which DOES still
pass its text-content assertion post-consolidation since the amber warning
box's text was folded into plain body copy, not lost — the documented Deviation
#2 preserves the string this test checks). AC-24 (no standalone `AlertDialog`
wrapper left in the 7 files) is best verified by literal `git ls-tree` /
existence-check + `grep AlertDialog` on the 5 call-site screen files, not by
running tests.
