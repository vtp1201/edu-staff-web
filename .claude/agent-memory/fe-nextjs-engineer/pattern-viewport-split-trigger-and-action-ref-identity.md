---
name: pattern-viewport-split-trigger-and-action-ref-identity
description: US-E24.13 — one control, two viewport behaviours = two elements gated by Tailwind hidden/sm:block (never matchMedia); a Server Action passed to a client prop must be the raw action (assert prop IDENTITY, not "is a function")
metadata:
  type: feedback
---

Two idioms confirmed while adding the bell dropdown (US-E24.13, header.tsx).

**1. Same slot, different behaviour per viewport → render BOTH, gate with
Tailwind breakpoint classes.** Mobile bell stays `Button asChild → Link`
(`<span className="sm:hidden">`), desktop bell becomes a `PopoverTrigger`
(`<span className="hidden sm:block">`).

**Why:** `hidden` is `display:none`, so the inactive twin leaves the
accessibility tree — `getByRole` finds exactly one "Thông báo" control at each
size, and existing stories that expect a `link` bell keep passing untouched. A
`matchMedia`/`useMediaQuery` hook would need its own mount guard against a
hydration mismatch, and this repo has no precedent for one. It is also the
header's own existing idiom (`md:block` search, `lg:hidden` hamburger).

**How to apply:** do NOT reuse the mobile branch's conditional `asChild={x !==
undefined}` Link logic for the new trigger — when the control opens a panel
there is no href, so it is a plain `Button`. Prove BOTH halves with
`page.viewport(w,h)` from `vitest/browser` inside the play function
(`@storybook/addon-viewport` is not installed; `parameters.viewport` is inert),
and restore 1280 at the end so later stories in the file aren't left at 375.

**2. A Server Action reaching a Client Component prop must be the EXPORTED
action itself.** A convenience closure that reshapes params
(`{filter,cursor}`→`{filter,limit}`) cannot cross the server→client boundary.

**Why:** that failure is runtime-only — tsc, `bun lint` and `bun run build` all
pass on a wrapped closure. Same bug class as [[gotcha-rsc-closure-prop-500]].

**How to apply:** make the client prop's signature match the action's exact
shape instead of wrapping. Guard it in the RSC layout's node test with
`expect(shell.props.onX).toBe(actions.xAction)` (identity), importing the
actions module AFTER the layout so both resolve to the same instance. Note the
layout test's `vi.mock("./(shared)/.../actions")` factory must list EVERY new
export or the render throws.

Related: [[pattern-server-action-as-prop-step-machine]],
[[gotcha-storybook-viewport-and-upload-limits]],
[[gotcha-tone-and-duplicate-i18n-copy]] (resisted adding a `panelTitle` key
holding the same string as `dropdownAriaLabel` — one string, one key).

**3. Review-round addenda (same story).**

- **Radix `Tabs` without a `TabsContent` is a WCAG 4.1.2 defect.** `TabsTrigger`
  ALWAYS emits `aria-controls`, so a list rendered as a sibling `<div>` leaves
  every tab pointing at a non-existent id. One `<TabsContent value={activeValue}>`
  wrapping the single rendered panel is enough (Radix owns id/`role="tabpanel"`/
  `aria-labelledby`). Prove it by reading the tab's `aria-controls` and asserting
  `document.getElementById(id)` has `role="tabpanel"`.
- **A Popover/Dialog whose first focusable is a conditional action button needs
  an explicit `onOpenAutoFocus`.** Radix `FocusScope` takes the first focusable in
  DOM order — here a "mark all read" button that only exists when there IS unread
  data, i.e. exactly the state users open in. `event.preventDefault()` + focus a
  `contentRef.current.querySelector('[role="tab"]')`. Needs TWO stories (with and
  without the conditional button) or the regression case stays untested.
- **An optional action prop whose absence is a fail-silent optimistic write should
  be made REQUIRED**, not runtime-gated: `await onX?.(id)` resolves `undefined`,
  the optimistic cache write still fires, then snaps back on invalidation. Push the
  "feature absent" branch up to the caller (header falls back to the link bell).
- **Module-scope story fixtures must be re-seeded in a story-scoped DECORATOR**,
  not at the top of `play` — the decorator runs before mount, `play` runs after the
  first fetch has already read the mutated store.
- **`useFormatter().relativeTime(date)` logs `ENVIRONMENT_FALLBACK` as a
  console.error** unless `now` is passed explicitly (`format.relativeTime(date,
  Date.now())`). It is the correct replacement for any hand-rolled `locale === "vi"
  ? … : …` time helper (those get called with a hardcoded `"vi"` at every site).
