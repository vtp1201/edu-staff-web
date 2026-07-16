---
name: us-e18.10-qa-patterns
description: QA patterns from US-E18.10 (class-log revise transition + error taxonomy) — gap-check recipe for role-gated action absence and new-transition error paths
metadata:
  type: project
---

US-E18.10 (class-log revise workflow) was a clean, well-covered implementation
(fe-tech-lead-reviewer had independently ground-truthed the BE Go source) but
Storybook coverage still had two class of gaps typical for this repo:

1. **Positive-path story exists, negative-role-gate story doesn't.** The new
   `TeacherReviseRejectedEntry` story proved the teacher sees "Revise & resubmit"
   for REJECTED — but nothing proved a **principal** viewing the same REJECTED
   entry sees NEITHER revise NOR approve/reject (both gated off: revise is
   `!isPrincipal`-gated, approve/reject is `SUBMITTED`-only). Added
   `PrincipalCannotRevise` story asserting all three buttons absent + the
   rejection banner/reason still visible (read-only). General rule: whenever a
   new action is gated by role AND by status, write a story for the
   role-mismatch case even if the status alone would already exclude it — the
   two gates can drift independently in future edits.

2. **"Existing story still passes" ≠ "existing story asserts the AC".** The
   pre-existing `TeacherEntryDetail` story (DRAFT entry) only asserted the
   back button appeared — it never asserted the "Gửi BGH phê duyệt" (submit)
   button was present or that clicking it transitioned the entry, even though
   the AC explicitly requires "DRAFT entry still shows Submit for approval".
   Extended it to click-through-to-SUBMITTED, mirroring the revise story's
   pattern (click → assert old button gone → assert new status text visible).
   Also added `TeacherReviseFails` (mocked `reviseEntryAction` failure) to
   directly exercise the toast/error path for the new transition, since
   "the toast mechanism is generic and already covered elsewhere" is a
   plausible-sounding excuse to skip a new-transition failure test — better to
   spend 10 lines confirming it than to accept the gap on faith.

Repo/tooling notes reconfirmed: `bun vitest:storybook run src/features/class-log`
is the correct command for Storybook interaction tests on this feature (separate
`vitest.storybook.mts` config/project from the main `bun vitest run`; story
count does NOT show up in the main run's file/test totals — two independent
gates, report both). Full baseline for this US: 292 files/1790 tests via
`bun vitest run` (pre-US baseline 290/1777); 10 Storybook interaction tests
after QA additions (8 pre-existing + 2 new; one existing story strengthened
in place, not counted as "new"). `tsc --noEmit` and `bun run build` both clean.

See also [story-play-gap-pattern](story-play-gap-pattern.md) (general pattern:
Default/happy stories often miss a per-AC assertion even when they "pass").
