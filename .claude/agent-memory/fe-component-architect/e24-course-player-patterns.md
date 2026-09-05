---
name: e24-course-player-patterns
description: US-E24.5 course-player component decisions — discriminated-union VM dispatch, inline switch (no dispatcher file), submit-box feature-local, TextContent stays in course-timeline/
metadata:
  type: project
---

US-E24.5 (course player, high-risk lane): dispatcher for a 5-way item-type body (lesson/
document/assignment/exam/locked) was designed as a discriminated union `ActiveItemVm` with
a `kind` field, switched inline inside the root container (`course-player.tsx`), NOT a
separate `<ItemBodyDispatcher>` file — the switch is small (~5 lines), only called once per
render, and lives naturally beside the header/panel composition the container already owns.
Each `body-*.tsx` receives `Extract<ActiveItemVm, {kind: "..."}>` so no component does its
own runtime itemType check or sees irrelevant optional fields.

**Why:** avoids "nested optional prop soup" — a single object with `lesson?`, `assignment?`,
`exam?` all optional would let every body component defensively check fields it can't use.
**How to apply:** when a screen renders one-of-N body types selected by a discriminated
union already known at the RSC boundary, default to an inline switch in the container
unless the switch itself grows non-trivial branching logic (then extract).

`submit-box.tsx` (mutation form, edit→confirm→done via `useReducer`) was kept feature-local
in `course-player/`, not promoted to `shared/`, because the design mockup showed it twice
(timeline inline-expand + player) but the timeline usage was TEMP code the same US deletes —
after deletion there's exactly one real caller. Promote-on-2nd-*real*-caller, not on-2nd-
*mockup*-appearance.

`TextContent` (plain-text-paragraphs renderer, no `dangerouslySetInnerHTML`) stayed at its
existing path `course-timeline/text-content.tsx` even though a NEW screen (course-player)
became its consumer — only its former caller (`item-detail.tsx`) was deleted, the file
itself is caller-agnostic. Don't reflexively move a reused file to `shared/` the moment a
2nd screen imports it if it's already sitting in a folder neutral to which screen calls it;
only promote when the file's CURRENT location becomes actively confusing (e.g. importing
"course-timeline" internals from an unrelated feature folder) or a 3rd consumer appears.

`ItemTypeChip`/`ItemStatePill` (`features/lms/presentation/shared/`) were designed from day
1 across E24.3/E24.4 with both named consumers already known — E24.5 became their 3rd
consumer with zero API changes needed. Pattern: composed components with a genuinely known
2nd screen at design time skip the "feature-local first" step entirely (0026 allows this —
the rule requires a 2nd REAL user before promoting, it doesn't forbid designing shared from
day 1 when both users are already named).
