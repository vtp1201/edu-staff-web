---
name: us-e18.26-qa-patterns
description: timetable by-member/room BE wiring — repository-level round-trip proof is not the same as UI-wiring proof; found+closed a real Storybook-interaction gap
metadata:
  type: project
---

US-E18.26 (timetable by-member views + admin `room` field, BE US-153/US-148 wiring).
Self-reported Evidence + Tech-Lead Review were both genuinely accurate for every file
they named — re-reading/re-running all 8 TDD-planned test files confirmed real,
non-vacuous assertions (e.g. `real-weekly-timetable.repository.test.ts`'s
`toHaveBeenCalledTimes(2)` for the teacher-schedule 1+N→2-call simplification;
`timetable.repository.test.ts`'s RMW-preserve test naming both the edited cell's room
AND an untouched sibling's room via two `toContainEqual` calls).

**Gap found+closed**: the admin builder's `room` field had full repository/mapper-level
round-trip proof (HTTP PUT body, read-back) but ZERO UI-level interaction proof —
`SlotEditorDialog`'s room `<Input>` was never opened/typed-into/saved in any story. The
only existing dialog story (`WithSlotEditorOpen`) checked two labels are visible and
never touched the room field or clicked Save. **Lesson: when a packet's proof section
says "X actually surviving a save+reload round trip," repository tests proving the HTTP
contract are NOT sufficient — always separately check for a component/Storybook-level
test that drives the actual form input → save action, especially for a field whose
history is "silently discarded" (ask #17 in this case).** Closed it myself: added
`RoomFieldEditAndSave` story to `timetable-screen.stories.tsx` — opens editor on a
filled cell, asserts the room `<Input>` is pre-populated from the existing slot (proves
read-side too), clears+retypes, clicks Save, asserts `updateSlotAction` called with only
`room` changed. 5/5 passing.

Also: a packet's TDD test-file plan named an exact path
(`repositories/mocks/timetable.mock.repository.test.ts`) that the engineer folded into
a different, pre-existing file (`timetable.repository.integration.test.ts`) instead —
verify by reading for the ASSERTION SUBSTANCE, not the exact filename; a reasonable
consolidation is not a gap.

See also [[us-e18.25-qa-patterns]] for the sibling notification-center US in the same
epic (self-reported coverage was also genuinely accurate there).
