---
name: gotcha-dropdown-to-dialog-and-exit-animation
description: Radix DropdownMenu→Dialog handoff keyboard-trap + the false-positive "dialog won't close" caused by asserting absence before the exit animation unmounts the node
metadata:
  type: feedback
---

Opening a Radix Dialog from a `DropdownMenuItem` (US-E23.1 header tenant-switch) has TWO real traps and ONE fake one. Verify empirically in the storybook/vitest browser runner, not by reasoning.

**Why:** an a11y auditor reported a "keyboard trap" (Escape never closes the dialog) and proposed a fix (controlled menu + `preventDefault` + `requestAnimationFrame`) they never actually ran. The proposed fix did NOT work, and part of the "bug" was a test artifact. Cost hours to untangle.

**How to apply — the three effects, separated:**

1. FAKE bug (test artifact): shadcn `Dialog`/`DropdownMenuContent` wrap children in Radix `Presence` with `motion-safe:data-[state=closed]:animate-out`. On close, `data-state` flips to `"closed"` INSTANTLY (escape/close DID work) but the DOM node lingers ~150-200ms until the exit animation ends. Asserting `expect(queryByRole("dialog")).not.toBeInTheDocument()` synchronously right after `{Escape}` FALSE-FAILS. Fix the TEST: `await waitForElementToBeRemoved(() => body.queryByRole("dialog"))` before asserting absence. Smoking gun to check first: log `dialog.getAttribute("data-state")` immediately after Escape — if `"closed"`, escape worked; it's a timing assertion bug, not a trap.

2. REAL bug — Escape swallowed while the menu is still mounted: `react-dialog` and `react-menu` each nest their OWN copy of `@radix-ui/react-dismissable-layer` (separate module = separate `context.layers` Set = NO shared layer stack). The closing-but-still-mounted (Presence exit animation) DropdownMenuContent is "highest" in ITS own context, so its escape handler `event.preventDefault()`s; the dialog's handler then sees `defaultPrevented` and skips (`index.js` line ~123-128). `requestAnimationFrame` (16ms) fires INSIDE the menu's ~150ms exit window → menu still mounted → swallow. Fix: close the (controlled) menu, then open the dialog only once `document.querySelector('[data-slot="dropdown-menu-content"]')` is null — poll per rAF, bounded (`frames++ > 30` fallback). No magic duration constant, opens ASAP. (Deduping the dismissable-layer copies via package.json `overrides` is the "correct" root fix but it's an app-wide dependency change → ADR/fe-lead, not a self-contained story fix.)

3. REAL bug — focus returns to `<body>` not the trigger: `useDialogReturnFocus` (shared Dialog) snapshots `document.activeElement` at open, but the unmounting dropdown's FocusScope resets focus to `<body>` in the SAME tick the dialog opens, so the auto-capture grabs `<body>`. `menuTriggerRef.current.focus()` just before `setDialogOpen(true)` is NOT enough (the focus-scope cleanup overrides it after). Fix: pass an EXPLICIT `onCloseAutoFocus={(e)=>{e.preventDefault(); triggerRef.current?.focus()}}` prop to the dialog — direct restore, no capture-timing dependency. When adding such a pass-through prop to a shared dialog, only spread it when defined (`{...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}`) — passing `undefined` clobbers DialogContent's default `returnFocus` for every other caller.

Runner: `bun run vitest:storybook run <name...>` works. Console.logs only flush on FAIL — temporarily `throw new Error("flush")` to see debug output, then remove.
