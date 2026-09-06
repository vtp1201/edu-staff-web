---
name: gotcha-radix-menu-roving-focus
description: Anything inside DropdownMenuContent that is not a registered menu item is keyboard-unreachable (Radix blocks Tab); use DropdownMenuRadioGroup/RadioItem, and a theme-FIXED token on a /15 tint is a dark-mode contrast bug
metadata:
  type: feedback
---

Two review blockers from US-E24.12 (shell avatar menu + dark mode).

**1. Custom controls inside a Radix `DropdownMenuContent` are keyboard-dead.**
Radix menu content blocks Tab and roving-focuses ONLY its own registered item
collection. A hand-built `<div role="radiogroup">` with native
`<input type="radio">` inside the menu renders fine, passes a click-based
Storybook play test, and is still 100% unreachable by keyboard (WCAG 2.1.1).

**Why:** the menu's `RovingFocusGroup` never sees non-item children, and Tab is
swallowed by the menu's key handler.

**How to apply:** anything selectable inside a dropdown menu must be a real menu
item — `DropdownMenuRadioGroup` + `DropdownMenuRadioItem`
(`role="menuitemradio"` + `aria-checked` free) or `DropdownMenuCheckboxItem`.
Keep any pure selection rule in a separate `*-options.ts` so the rebuild
doesn't touch its unit test. Prove it with a KEYBOARD story (focus trigger →
`{Enter}` → bounded `{ArrowDown}` loop until `toHaveFocus()` → `{Enter}`), not
just a click story — a click story passes on the broken markup.

**2. A theme-FIXED token on a `/15` tint = invisible in dark mode.**
`--edu-warning-foreground` (#2a3547) exists for text on SOLID yellow and has no
`.dark` value. On `bg-edu-warning/15` over a dark card it composites to 1.10:1
(WCAG 1.4.11 needs ≥3:1 for icons/graphical objects). Fix is
`text-edu-text-primary` — same navy in light (zero visual diff), flips to
#eaeff5 in dark.

**How to apply:** when adding dark mode, grep for EVERY consumer of a fixed
foreground token, not just the one that surfaced (`StatusBadge` AND `StatCard`
AND `features/grades/.../batch-status-badge.tsx` all had it). Prove the fix with
a dark story asserting the COMPUTED color
(`getComputedStyle(icon).color === "rgb(234, 239, 245)"`) — a class assertion
would have passed on the broken code too, and `globals: { theme: "dark" }` is
ignored by the vitest browser runner (use `src/test/storybook-dark-decorator`).

Related: [[gotcha-tone-and-duplicate-i18n-copy]], [[gotcha-aria-disabled-edge-control]].
