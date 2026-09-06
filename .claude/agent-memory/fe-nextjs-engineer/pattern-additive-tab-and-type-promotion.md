---
name: pattern-additive-tab-and-type-promotion
description: US-E24.14 — adding a 3rd tab to a shipped screen; promoting a presentation-declared type into domain/ via re-export; two skeleton components = two live regions; legend words break getByText
metadata:
  type: project
---

Adding a tab to an already-shipped screen (US-E24.14, `/teacher/attendance`) — reusable shape.

**Why:** the packet demanded the existing two tabs stay behaviorally byte-identical while a
third tab brought its own URL params, query family and un-capped repo read.

**How to apply:**

- **A new repo method, not a widened one.** History is capped at 31 days (`MAX_HISTORY_DAYS`);
  the summary spans a year. Same route + same params, different projection ⇒ a SIBLING method
  (`getClassAttendanceRange`) so raising one bound can never move the other screen. Adding a
  method to `IAttendanceRepository` breaks every hand-rolled fake in `*.use-case.test.ts` —
  patch them all in one pass (`satisfies IAttendanceRepository` catches them at `tsc`).
- **Roster + records, not records alone.** A per-student rollup needs the roster as the row set
  (zero-record students exist only there) AND for the name join. Return `{roster, records}` from
  the repo; the "return rows with `name` pre-joined" idea silently drops never-marked students.
- **Type declared in `presentation/` but needed by `domain/`** (`TermWindow`/`YearWindow` from
  `resolve-student-range.ts`): a type-only domain→presentation import still violates the layer
  table. Promote the interface to `domain/entities/<x>.entity.ts` and leave a
  `export type { … } from "@/features/.../entities/…"` re-export in the old file — every caller
  keeps compiling, zero test edits. Do NOT re-declare a second copy.
- **Two shared skeletons = two `role="status"`.** `StatCardSkeletonGrid` + `ListSkeleton(inline)`
  each own a live region; pass `announce={false}` to the grid so one load is announced once
  (assert `getAllByRole("status")` has length 1).
- **Storybook getByText traps in this tab:** the band words (Đạt / Cảnh báo / Nguy cơ) appear in
  both the chip and the thresholds LEGEND, and an at-risk student's name appears in both the
  table and the alerts aside ⇒ scope with `within(canvas.getByRole("table"))` before
  `getByText`.
- **Query-key isolation is testable without React:** seed a bare `QueryClient` with both key
  families, `invalidateQueries`, assert the other family's `getQueryState(...).isInvalidated`
  is `false`. Cheaper and stronger than a render test.
- Radix `ToggleGroup type="single"` answers `""` when the active item is re-clicked — guard it,
  a range filter has no "none" state. Its items render as `role="radio"`, not `button`.

See also [[pattern-shared-list-states]], [[pattern-role-discriminated-vm]],
[[gotcha-storybook-viewport-and-upload-limits]].
