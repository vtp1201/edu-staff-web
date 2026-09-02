---
name: pattern-per-card-fanout-and-server-urgency
description: E24.2 — N+1 rollup with per-CARD degrade (null count ≠ 0) + urgency threshold decided server-side so tone can't drift with the reader's clock
metadata:
  type: project
---

Two shapes that recur whenever BE has no rollup endpoint and the design shows an
urgency tone.

**1. Per-card degrade, not per-page.** `listX()` then `Promise.allSettled(rows.map(r =>
listItems(r.id)))` inside ONE use-case; map back by INDEX (`settled[i]`), returning
`{ row, summary: null, itemsFailed: true }` for a rejected leg. Two error LEVELS: the
list read failing = whole-page failure `Result`; one leg failing = that card only. The
VM must express "unknown" separately from "zero" (`openCount: number | null`) — rendering
`0 mục đang mở` for a failed read is a confident lie. Unit-test the mixed case (one leg
rejects, siblings unaffected); it is unreachable from an RSC-only test.
Contrast [[pattern-fanout-partial-degrade]] (E13.9), where the degrade was aggregated
into one `failedClassCount` notice instead of per row.

**Why:** the packet floated "do the allSettled in page.tsx"; putting it in a use-case is
what makes the partial-failure branch TDD-able against a mock repository.

**How to apply:** any "N+1 tạm chấp nhận" line in a packet. When BE ships the rollup only
the use-case body changes — VM/UI/i18n stay.

**2. Threshold flags belong in the VM, computed once server-side.** "due within 48h" ships
as `nextDue.dueSoon: boolean`, derived in a pure `*.derive.ts` from the ONE `now` the RSC
captured. A component computing it from `Date.now()` would silently re-colour a tab left
open, and it makes the boundary (exactly 48h = still urgent) untestable. Presentation only
formats the date (`useFormatter`, same options as the sibling timeline — the actual
`dd/MM HH:mm` order is locale-owned, so assert `/^<type> · hạn .+/` in stories, not a
digit pattern).
