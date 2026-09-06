---
name: radix-menu-tab-trap
description: Non-menu-item interactive content inside a Radix DropdownMenu is keyboard-unreachable (Tab is preventDefault'd) — reject it in review
metadata:
  type: project
---

Any focusable control placed inside `DropdownMenuContent` that is NOT a
`DropdownMenuItem`/`CheckboxItem`/`RadioItem` is **unreachable by keyboard**.

**Why:** `node_modules/@radix-ui/react-menu/dist/index.mjs` `MenuContentImpl`
(shared by modal AND non-modal) does `if (event.key === "Tab") event.preventDefault()`
for any keydown inside `[data-radix-menu-content]`. Arrow-key navigation is a
`RovingFocusGroup` over the *item collection* only, so a plain `<div>` with
`<button>`/`<input type=radio>` inside it is skipped by arrows and blocked from Tab.
`focus-within:ring-*` styling on such a control is a tell that the author assumed
Tab works. Pointer-only Storybook `play` functions pass while WCAG 2.1.1 (Level A)
fails — first seen US-E24.12 (header avatar-menu language switcher).

**How to apply:** on any dropdown-menu diff, grep the new `DropdownMenuContent`
children for raw `<button>`/`<input>`/`role="radiogroup"`. Required fix is to use
the menu's own primitives (`DropdownMenuRadioGroup` + `DropdownMenuRadioItem` →
`role="menuitemradio"`, in the roving collection) — not extra ARIA. Also require a
keyboard-path assertion in the story, not just `userEvent.click`.
Related: [[recurring-violations]].
