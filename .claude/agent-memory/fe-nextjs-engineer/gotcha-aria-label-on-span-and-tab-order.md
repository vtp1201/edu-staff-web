---
name: gotcha-aria-label-on-span-and-tab-order
description: Biome rejects aria-label on a bare span (put the phrase on the parent link, hide the pill); inserting a nav/pill row above an existing list breaks every userEvent.tab() story
metadata:
  type: feedback
---

Two things that only bite at `bun lint` / Storybook time, after everything else
is green.

**1. `aria-label` on a plain `<span>` fails Biome** (`useAriaPropsSupportedByRole`
— the attribute is not supported by a role-less element). Hit while labelling a
tab's count pill ("Đang mở, 4 mục").

**Why:** an element with no implicit role has nothing for `aria-label` to name,
so the label is silently dropped by AT anyway — the lint rule is right.

**How to apply:** put the whole phrase on the **interactive parent** as its
`aria-label` (it becomes the tab/link's accessible name — which is what you
wanted announced) and mark the visible numeral `aria-hidden="true"`. Do NOT
reach for `role="img"` on the span, and do not add a second `sr-only` span —
that yields a stuttering "Đang mở Đang mở, 4 mục". Regex-based
`getByRole("tab", { name: /Sắp mở/ })` queries keep matching the longer name.

**2. A new pill/tab row above an existing list breaks keyboard stories.** Any
`userEvent.tab()` story that assumed "first Tab lands on the first card" now
lands on the first pill.

**How to apply:** don't just bump the tab count — tab through the new controls
and ASSERT each one is the expected link. The fix doubles as proof the new row
is keyboard-reachable rather than click-only. Check for `userEvent.tab()` in a
screen's existing stories before inserting anything above its main region.
