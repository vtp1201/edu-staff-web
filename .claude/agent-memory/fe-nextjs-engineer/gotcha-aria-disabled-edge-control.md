---
name: gotcha-aria-disabled-edge-control
description: A control that becomes unavailable while it holds focus (reorder at list edge) must use aria-disabled + a no-op onClick guard, never native disabled — plus how to test it
metadata:
  type: feedback
---

A button that goes from available to unavailable **as a result of its own
click** (reorder up/down reaching the first/last row, step controls at a bound)
must use `aria-disabled={!can}` plus an early-return guard in `onClick`, NOT the
native `disabled` attribute.

**Why:** native `disabled` removes the element from the tab order the instant it
flips, so the browser silently drops focus to `<body>` (WCAG 2.4.3) — the
keyboard user loses their place with no warning. Found as A11Y-001 on US-E24.10
(`timeline-row.tsx`). Same root cause as the a11y agent's "HTML disabled attr
breaks roving tabindex" note for `role="tab"`.

**How to apply:**
- Style it yourself — the shared `Button` primitive only styles `disabled:`, so
  add `aria-disabled:opacity-50 aria-disabled:hover:bg-transparent` at the call
  site. Do NOT use `aria-disabled:pointer-events-none`: testing-library refuses
  to click a `pointer-events: none` element, so the "click is inert" test would
  become unwritable.
- Pair it with a live region. A reorder is a purely visual change; add ONE
  persistent (always-mounted, never conditionally rendered) `role="status"
  aria-live="polite"` sr-only node in the list owner and set its text only after
  the mutation is CONFIRMED — announcing an optimistic position that then rolls
  back states the opposite of what the rows show.
- Testing: `toBeDisabled()` ignores `aria-disabled` — assert
  `toHaveAttribute("aria-disabled", "true")` (and `"false"`, which React does
  render). In node static-markup tests, `expect(html).toContain("disabled")`
  passes on `aria-disabled` too — assert `not.toContain('disabled=""')` to
  actually pin the native attribute down.
- To exercise the edge in a Storybook play test, the mutation mock must ECHO the
  requested ordering (the usual fixed-fixture mock reverts the optimistic write,
  so the row never reaches the edge). Then assert
  `document.activeElement` is still the button, not `document.body`.

Related: [[pattern-third-mode-on-shared-component]],
[[gotcha-aria-label-on-span-and-tab-order]], [[pattern-irreversible-step-machine]].
