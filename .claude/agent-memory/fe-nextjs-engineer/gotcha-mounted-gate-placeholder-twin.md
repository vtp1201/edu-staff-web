---
name: gotcha-mounted-gate-placeholder-twin
description: Deleting a control behind a `mounted ?` hydration gate must also delete its SSR placeholder twin, or a phantom skeleton flashes on hydration
metadata:
  type: feedback
---

When a component renders `mounted ? <RealControls/> : <Placeholder/>` (the
`useEffect(() => setMounted(true))` hydration gate — `components/layout/app-shell/header/header.tsx`
is the canonical instance), every real control has a **1:1 shape-matching twin**
in the placeholder branch that reserves its width. Removing a control from the
real branch and leaving the twin = a phantom skeleton element that renders on
first paint and then vanishes on hydration → layout shift for a control that no
longer exists.

**Why:** found in US-E08.8 (RoleSwitcher removal). The twin is `aria-hidden` +
`tabIndex={-1}` so it is invisible to every test, story query and grep — nothing
fails, it only shows up visually for ~1 frame. tsc/lint/tests all stay green with
the bug in place.

**How to apply:** whenever you ADD or DELETE an element inside a `mounted ?`
(or any SSR/skeleton) branch, diff the two branches element-for-element and keep
them in sync in the same commit. Call it out explicitly in the report — it reads
as out-of-scope creep otherwise, but it is part of the removal.
