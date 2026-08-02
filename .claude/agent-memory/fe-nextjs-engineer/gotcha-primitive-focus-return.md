---
name: gotcha-primitive-focus-return
description: Focus-restore inside a Radix Content PRIMITIVE must snapshot on onOpenAutoFocus (useAutoFocusReturn), not at first render — the open-based useDialogReturnFocus captures <body> there and actively regresses trigger-based dialogs; dialog.tsx still has this bug
metadata:
  type: feedback
---

**Rule: in a Radix `Content` primitive (`components/ui/sheet|dialog`), use
`useAutoFocusReturn()` (snapshot on `onOpenAutoFocus`), NOT
`useDialogReturnFocus(true)`.** In a WRAPPER component that owns `open`, keep
`useDialogReturnFocus(open)`.

**Why:** a `Content` is rendered unconditionally inside its `Root` — only Radix
`Presence` decides mounting — so the component function first runs while the
dialog is still CLOSED. `useDialogReturnFocus(true)` snapshots
`document.activeElement` there and captures `<body>`. Its handler then
`preventDefault()`s and focuses `<body>`, which is worse than nothing: it also
suppresses Radix's own `triggerRef` restore, so even a `<SheetTrigger>`-based
sheet loses focus on close. Measured in the Storybook browser runner
(US-E18.32), not theorised. Radix dispatches `onOpenAutoFocus` BEFORE FocusScope
moves focus into the content, so `document.activeElement` there is the true
invoker; only `preventDefault()` on close when the snapshot `isConnected`, so a
trigger-based dialog keeps its built-in behaviour.

**How to apply:** put both handlers before `{...props}` (consumer overrides
still win). Prove it with THREE stories: controlled-open (fails without the
fix), trigger-based (passes either way = regression guard), and the real screen.
Verify red by deleting only the two handler props and re-running.
`components/ui/dialog/dialog.tsx` STILL has the bug (reproduced: trigger +
Escape → focus on `<body>`); fixing it touches every Dialog consumer, so it was
flagged to `fe-lead` rather than bundled.

Related: [[pattern-portal-dialog-testing]], [[gotcha-dropdown-to-dialog-and-exit-animation]].
