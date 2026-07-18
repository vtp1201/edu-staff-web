---
name: us-e23.1-qa-patterns
description: Tenant-switch header menu/dialog QA pass — real CSS-grid overflow bug found via viewport resize test; AC-6 no-op spy gap; backdrop-vs-Escape distinction
metadata:
  type: project
---

US-E23.1 (header "Đổi trường" menu + "Chọn trường" dialog, high-risk
authorization lane) QA pass findings:

- **Real MAJOR defect found**: shared `components/ui/dialog/dialog.tsx`
  `DialogContent` is a CSS `grid` container; its direct children
  (`DialogHeader`, a card `<ul>`) have no `min-w-0`, so per CSS Grid's default
  `min-width:auto` item sizing they refuse to shrink below their content's
  intrinsic min-width — causes real horizontal overflow inside ANY dialog
  whose content has an un-wrappable row (here: `TenantCard`'s name+badge row,
  intrinsic ~350px) at narrow viewports, even though the dialog's own outer
  box (`max-w-[calc(100%-2rem)]`) shrinks correctly. Contradicts a
  design-review Evidence block's confident claim of "no fixed-width
  breakpoints to break at 320px" — **design-review sign-off is not proof**,
  a real `page.viewport()` resize test is. Blast radius: likely affects other
  dialogs using this shared primitive, not just this story.
  - Debug technique: temporarily append a throwaway story that walks
    `dialog.querySelectorAll("*")`, compares each `getBoundingClientRect().right`
    against the dialog's own right edge, and `throw new Error(offenders.join("\n"))`
    to surface exact overflowing elements/pixel deltas in the failure output
    (console.log doesn't reliably surface from the browser runner to the
    terminal; throwing does). Remove the throwaway story before finalizing.
- **AC-6/FR-005 no-op-on-current-card gap**: `TenantCard` itself always calls
  `onActivate` regardless of `isCurrent` (by design — the no-op guard lives in
  the parent `TenantSwitchDialog.handleActivate`). A `Current` story on
  `TenantCard` alone can never prove "no network call on current-card click" —
  that guard must be tested at the `TenantSwitchDialog` level with a spy
  (`fn()`) asserting `onSwitchTenant` was NOT called. Easy to miss since the
  leaf component's own story looks complete.
- **Backdrop vs Escape are NOT the same test.** A `DismissBlockedWhileBusy`
  story that only presses `{Escape}` does not prove backdrop-click dismiss is
  also blocked — click `document.querySelector('[data-slot="dialog-overlay"]')`
  directly (Radix's `Dialog.Overlay`, the element `onPointerDownOutside` fires
  from) as a distinct assertion. Same pattern applies to the idle-dismiss
  companion.
- **Real viewport-resize recipe reused from US-E22.1**: `page.viewport(w, h)`
  from `vitest/browser` (NOT `parameters.viewport`, addon-viewport isn't
  installed — that param is inert in this repo's Storybook browser runner).
  `waitFor(() => expect(window.innerWidth).toBe(w))` before measuring; measure
  `scrollWidth <= clientWidth` on the dialog/content element AND each card's
  `getBoundingClientRect().right` against the dialog's own right edge (not the
  raw viewport width, since the dialog itself has padding/max-width). Kept
  the resulting 2 failing tests committed (repo convention, matches
  `email-verify-dialog.stories.tsx` `Viewport320`) rather than deleting them.
- **AppShell's one-shot `?switched=1` toast effect has zero test above the
  pure-parse level** (`parse-switched-param.test.ts` proves parsing only).
  `AppShell` has no Storybook story (pulls in `useRealtimeEvents`, which opens
  a real `EventSource`, no established mocking recipe in this repo for that).
  Judged not worth forcing a fragile story through for a MINOR-risk gap —
  documented as a flagged-not-blocking finding rather than a forced test.
  Recommend engineer extract the "read-once-then-strip" sequence into a small
  hook (mirroring the `switch-activation.ts` Risk-A extraction pattern) if
  this ever needs real proof.
- **Non-switchable memberships rendering as clickable cards is intentional,
  not a bug** — initially looked like a filter gap (dialog renders ALL
  `memberships`, not just `isSwitchable`), but AC-004.6's own wording
  explicitly anticipates a SUSPENDED/INACTIVE membership being clickable and
  relies on the existing 403 handling to reject it server-side. Read the AC
  text carefully before flagging a missing-filter as a defect.
