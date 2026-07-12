---
name: us-e22.1-qa-patterns
description: Email verification (banner/profile-row/OTP dialog) QA pass — Radix Dialog focus-restore gotcha, real-viewport-resize confirms genuine overflow, shared-Context convergence test recipe
metadata:
  type: project
---

US-E22.1 (email verification: shell banner + Profile row + OTP dialog, shared
EmailVerifyProvider cooldown context) QA pass found two REAL production defects
via test-writing (not test bugs) — both left as intentionally-failing regression
tests with inline DEFECT comments, not silently fixed (QA writes tests only).

## Defect 1 — Radix Dialog never restores focus when opened without `<DialogTrigger>`
`@radix-ui/react-dialog`'s `DialogContentModal` ALWAYS does
`onCloseAutoFocus: (event) => { event.preventDefault(); context.triggerRef.current?.focus() }`
— this unconditionally suppresses FocusScope's generic "restore to whatever was
focused before open" behavior and defers to `context.triggerRef`, which Radix
ONLY populates via `<DialogTrigger>`. Any screen that opens a shadcn `Dialog` via
manual `open`/`onOpenChange` state from a plain `<button onClick={() =>
setOpen(true)}>` (no `<DialogTrigger>`) will NEVER restore focus on close —
Escape, "Done"/close-X, all land on `<body>`. The accessibility auditor's earlier
"cross-browser focus-return" fix (`e.currentTarget.focus()` on the CTA before
opening) does NOT fix this — it only affects what's focused BEFORE open, which
Radix ignores. Real fix: wrap the invoking control in `<DialogTrigger asChild>`,
or add an explicit `onCloseAutoFocus` override on that screen's `DialogContent`.
Check any screen using `Dialog`/`DialogContent` with manual open state (grep for
`onOpenChange={set` without a nearby `DialogTrigger`) for this same bug class.

## Defect 2 — real 320px overflow in fixed-width cell rows (OtpInput)
`OtpInput`'s 6 cells (`w-11.5`=46px + `gap-2` between, ~301px row) don't fit the
dialog's ~270px content area at a real 320px viewport (`scrollWidth` 340 >
`clientWidth` 318, last cell overflows the dialog's own right edge). Confirmed
by ACTUALLY resizing via `page.viewport()` from `vitest/browser` (see
[us-e17.9 memory]) — NOT via `parameters.viewport` (inert, no addon-viewport
installed in this repo). Any fixed-pixel-width row (no `flex-1`/shrink) is a
320px-viewport risk; always measure `element.scrollWidth <=
element.clientWidth` on the CONTAINER at a genuinely resized viewport, not just
child-vs-child non-overlap (cells here don't overlap each other, but the row as
a whole overflows its parent — both checks are needed).

## Test recipes that worked
- **Convergence flow in one play()**: Profile CTA → wrong code → expired code →
  lockout → resend unlocks → success → close → badge flips, all against ONE
  `EmailVerifyProvider` instance and a stateful mock `onConfirm` (call-count
  branching) — proves AC-007.7 (reactive update, no reload) end-to-end instead
  of testing each error state in isolation.
- **Shared-cooldown-across-surfaces proof**: mount `EmailVerifyBanner` AND
  `EmailVerifyDialog` under the SAME provider in one story to prove AC-008.4
  (shared clock). Dialog MUST start closed — Radix marks the rest of the page
  `aria-hidden`+`pointer-events:none` while a modal is open (correct a11y
  behavior, not a bug), so trigger the banner's cooldown FIRST, then open the
  dialog afterward and assert it reflects the already-running countdown.
- **maxLength=1 input pitfall**: after a controlled OTP cell already has a
  digit, `userEvent.keyboard()` typed while that cell still has focus does
  NOTHING (browser blocks insertion at maxLength with no selection) — after any
  backspace-to-previous-cell assertion, explicitly re-click the NEXT empty cell
  before continuing to type, don't assume focus auto-advanced.
