---
name: capped-count-and-badge-accname
description: E24.7 review fixes — cap an unbounded drain into a "N+" lower bound (never a fabricated 99+); StatusBadge aria-label is not a reliable accessible name; auto-fill minmax grids break at 320px
metadata:
  type: feedback
---

Three fixes that recur on any card-grid + KPI screen.

**1. Capped count, not a fabricated ceiling.** A "glanceable" KPI must never
drain every page of a list to count a subset. Read ONE page, and when
`pagination.hasMore`, mark the value as a LOWER BOUND
(`openViolationsCapped?: boolean` on the entity → `suffix: "+"` on the tile →
renders `2+`).
**Why:** a reviewer asked for `"99+"`, but the SUBMITTED count on page 1 is not
99 — page 1 can hold 100 mixed-state rows with 2 SUBMITTED, so `99+` is a
default-shaped lie (see [[pattern-unfake-non-persistent-field]]). `N+` is the
same cheap cap and stays honest.
**How to apply:** add `fetchFirstPage()` next to `fetchAllPages()` returning
`{items, hasMore}`; prove it with a CALL-COUNT assertion — a red test here shows
up as an infinite loop (the mock keeps returning the same `nextCursor`), not a
plain failure. Reuse the existing `KpiTileVM.suffix` so the VM contract does not
grow.

**2. `aria-label` on `StatusBadge` is not a reliable accessible name.** It
renders a plain `<span>` (role=generic), where AT may ignore `aria-label`.
**How to apply:** keep the label but ALSO carry the meaning in text —
`<span aria-hidden="true">{shortPill}</span><span className="sr-only">{fullWording}</span>`.
Both `getByLabelText` and `getByText` then assert it.

**3. `grid-cols-[repeat(auto-fill,minmax(300px,1fr))]` overflows at 320px.**
AppShell adds 16px padding each side → 288px of content.
**How to apply:** `grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
— and apply the SAME classes to the matching skeleton (it is a separate
component and is easy to miss). A skeleton that is fully `aria-hidden` also
needs a sibling `role="status" aria-live="polite" sr-only` label, cf.
[[pattern-import-allowlist-and-success-live-region]].

Also: hover elevation on a whole `<article>` implies the card is clickable —
put the hover cue on the single navigable element (the CTA link) instead.
Design-system caption floor is 11px; `text-[10.5px]` is below it.
