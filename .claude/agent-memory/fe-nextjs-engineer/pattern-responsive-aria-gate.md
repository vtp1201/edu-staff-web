---
name: pattern-responsive-aria-gate
description: Gating an ARIA attribute (aria-hidden) by breakpoint needs JS matchMedia; CSS media queries cannot toggle HTML attributes
metadata:
  type: feedback
---

Responsive `aria-hidden` (or any HTML attribute) that must differ by breakpoint
CANNOT be done with Tailwind/CSS media queries — CSS only styles, it cannot add/
remove attributes. Use a small SSR-safe `useIsMobile()` hook (`window.matchMedia(
"(max-width: 767.98px)")`, default `false` during SSR so desktop never flashes the
attribute) to gate the attribute in JSX.

**Why:** US-E17.3 messaging single-pane. The off-screen pane needed `aria-hidden`
at mobile but NOT at desktop (both panes always visible ≥768px). The pane's visual
slide + its reduced-motion guard stay pure CSS (`motion-reduce:transition-none`) —
only the `aria-hidden` attribute needs the JS matchMedia gate. This distinction
matters: an "AC-17 no-matchMedia" rule usually targets the reduced-motion guard
(which must be CSS), NOT a responsive attribute gate.

**How to apply:** No shared `useMediaQuery`/`useIsMobile` exists in the repo yet —
co-locate a minimal hook in the feature's presentation folder (promote to
`components/shared` only when a 2nd screen needs it). 767.98px == Tailwind's max-md.

Note repo test toolchain: Vitest env is `node`, no `@testing-library/react`
installed — so TDD "component tests" = extract pure helpers (class/aria logic) and
unit-test those; DOM behaviour goes to Storybook interaction stories. See
[[gotcha-storybook-vitest-runner-broken]].
