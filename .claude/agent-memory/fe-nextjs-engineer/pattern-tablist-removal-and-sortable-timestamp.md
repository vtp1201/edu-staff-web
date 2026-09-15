---
name: pattern-tablist-removal-and-sortable-timestamp
description: US-E24.15 — merging two tab-filtered lists into one sorted list; a display-formatted time is not a sortable field; folding a type marker into an existing aria-label
metadata:
  type: project
---

Merging a tablist-filtered list into ONE list (US-E24.15, messaging inbox).

**Why:** a list that was split by tabs carries hidden assumptions once the tabs go.

**How to apply:**
- A `lastMessageTime`-style field is often a DISPLAY label ("10:15" / "Hôm qua") and
  cannot be sorted. Check the entity before accepting a "sort by X desc" AC — the raw
  ISO may already be on the wire DTO and simply dropped by the mapper (additive
  optional field + passthrough = no repo/use-case signature touched).
- Missing-timestamp fallback: return `0` and rely on `Array.prototype.sort` stability
  (ES2019) — that IS "keep design order"; never invent a synthetic tiebreaker.
- Any code that OPTIMISTICALLY prepends a row breaks under the new sort (a row with no
  timestamp sorts last). Seed the optimistic row with its real creation instant.
- Stories that previously clicked a tab to reveal a row now see the row in BOTH panes →
  `getByText` becomes "found multiple elements". Audit sibling stories, not just the
  ones the plan listed.
- A type marker (group vs direct) must be folded into the row button's existing explicit
  `aria-label` — a nested sr-only span is swallowed by accname (same constraint the
  presence suffix already documents). See [[pattern-role-discriminated-vm]].
- Counting "header buttons" in a story: `querySelectorAll("button")` filtered by
  `!b.closest("ul")` — a `div > div` selector silently matches row containers.
- Icon-button mobile touch target idiom in this repo: `size-9 max-[820px]:size-11`.

Review-round additions (reviewer caught these):
- When a dual-render forces you to RELAX an assertion (`getAllByText(...).length > 0`),
  the ordering/position guarantee it used to prove is now unguarded. Keep the relaxed
  text lookup AND add a positional assertion on the list itself
  (`querySelectorAll("ul > li > button")[0]` + `toHaveAccessibleName(expect.stringContaining(...))`).
  A lower-bound count (`toBeGreaterThanOrEqual(1)`) should be pinned to the exact number
  of legitimate surfaces once you've verified them.
- Do NOT keep a fallback path "live" in DEFAULT DEMO fixtures just to exercise it — the
  demo inbox then LOOKS broken at design review. Prove the fallback in the pure unit test
  + a dedicated story; make the mock data itself visibly correct.
- Auto-select/default-highlight code paths that index raw data (`items[0]`) must be run
  through the same sort the list renders, or `aria-current` lands mid-list.
- **commitlint here has NO `a11y` type** (feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)
  — an a11y fix commits as `fix(<scope>): …`.
