---
name: gotcha-filter-pills-a11y
description: Biome a11y/useSemanticElements rejects role=radio / role=group on div/button; the noAutofocus suppression has no effect — fix patterns for filter-pill UIs
metadata:
  type: feedback
---

Two recurring Biome a11y failures when building styled filter-pill rows + inline editors:

1. **`role="radio"` on a `<button>` / `role="group"` on a `<div>`** → Biome
   `lint/a11y/useSemanticElements` ERRORS (wants `<input type=radio>` / `<fieldset>`).
   **Fix:** styled toggle pills use `aria-pressed={active}` on plain `<button type=button>`
   (no role), wrapped in a `<fieldset className="border-0 p-0">` + `<legend className="sr-only">`.
   This is WCAG-valid and the packet explicitly allows aria-pressed as an alternative to radiogroup.
   In Storybook query the pill via `getByRole("button", { name: /label/ })`, not `radio`.

2. **`autoFocus` prop + `// biome-ignore lint/a11y/noAutofocus`** → the suppression
   WARNS "has no effect" because `noAutofocus` isn't enabled in this repo's biome config,
   yet leaving raw `autoFocus` is still discouraged. **Fix:** drop `autoFocus`, focus
   imperatively with a `useRef` + `useEffect(() => { if (open) ref.current?.focus() }, [open])`.
   Satisfies the AC-9 focus-management requirement without lint noise.

**Why:** hit both on US-E09.3 staff-leave filters + inline reject editor; cost a lint
round-trip. **How to apply:** reach for aria-pressed-in-fieldset and ref-focus from the
start on any segmented/pill filter or auto-opening field, instead of ARIA roles / autoFocus.
