---
name: project-e23-tenant-switch
description: E23 Multi-Tenant Switch epic — US-E23.1 header menu+dialog implemented; US-E23.2 post-login screen shares TenantCard, not yet built
metadata:
  type: project
---

US-E23.1 (Header Tenant-Switch Menu + Dialog) implemented and merged to main
(2026-07-19, commit `0ccd775`). US-E23.2 (post-login select-tenant screen,
full-page grid reusing the SAME `TenantCard`/`TenantLogo` from
`components/shared/tenant-card/`) is planned but not yet built — next FE
session on this epic should read US-E23.1's `architecture.md`/`state-design.md`
in the E23.1 packet before designing E23.2, since the data-shape contract
(`TenantCardViewModel`, `resolveTenantDisplay`/`enrichMemberships` helpers in
`src/features/tenant/infrastructure/`) is already locked and must not diverge.

**Why**: BA (`spec.md`) explicitly required both stories render an identical
`TenantCard` concept — the shared-component placement (`components/shared/`,
not feature-local) was made from day one, not "build-then-promote", precisely
so E23.2 could import directly.

**How to apply**: when picking up US-E23.2, do NOT re-invent the mock display
lookup or the ViewModel shape — import `TenantCardViewModel`/`TenantLogo`/
`TenantCard` from `components/shared/tenant-card/` and `enrichMemberships`/
`resolveTenantDisplay` from `features/tenant/infrastructure/`. `TenantSwitchDialog`
itself is NOT shared (E23.2 is a full route, not a dialog) — don't try to reuse it.

Key patterns validated on US-E23.1, reusable for US-E23.2 and any future
Server-Action-invoking dialog work:
- **Server Action redirect-vs-error disambiguation** (Path A pattern): when a
  Server Action must both `redirect()` on success AND return a classifiable
  error, wrap the use-case call in try/catch, classify via a `toFailure()`
  domain mapper (never inspect `err.status` client-side — Next.js redacts
  custom error properties across the Server Action boundary in production
  builds), return a discriminated `{ok:true}|{ok:false;errorKey}` result, and
  put `if (isRedirectError(err)) throw err` (deep import
  `next/dist/client/components/redirect-error` — no stable public re-export
  exists) as the FIRST line of the catch so the success-path redirect throw is
  never swallowed. See [[reference-nextjs-server-action-error-boundary]] (fe-state-engineer memory) for the full writeup.
- **DropdownMenu→Dialog composition keyboard trap** (genuine WCAG 2.1.2
  finding, not theoretical): opening a controlled `Dialog` from inside an
  ALREADY-OPEN `DropdownMenu`'s `onSelect` breaks Escape/focus because
  `@radix-ui/react-dialog` and `@radix-ui/react-dropdown-menu` each carry
  their OWN copy of `@radix-ui/react-dismissable-layer` (separate module
  instances → separate layer stacks) — the closing-but-still-animating-out
  dropdown swallows the Escape meant for the dialog, and its FocusScope resets
  focus to `<body>` in the same tick the dialog opens. Fix: control the
  `DropdownMenu`'s own `open` state, `event.preventDefault()` in the item's
  `onSelect`, close the menu, then poll `requestAnimationFrame` until the
  menu's content node (`[data-slot="dropdown-menu-content"]`) is actually gone
  before `setDialogOpen(true)`; pass an explicit `onCloseAutoFocus` to the
  Dialog content that focuses the real trigger ref (the shared `Dialog`'s
  default `onCloseAutoFocus`/`useDialogReturnFocus` auto-capture is NOT
  sufficient here since it captures `<body>` in this specific composition —
  works fine for a directly-triggered dialog, breaks for this composed case).
  A real `overrides`-based Radix-package dedup (single shared
  `dismissable-layer` instance) would fix this class of bug app-wide but is a
  deliberate NOT-done — flagged as an app-wide follow-up, not applied
  unilaterally on a single-story branch.
- **Shared `DialogContent` grid min-width overflow**: `DialogContent`
  (`src/components/ui/dialog/dialog.tsx`) is a CSS `grid`; grid items default
  to `min-width:auto`, so wide-content children (e.g. an unwrapped name+badge
  row) refuse to shrink below their intrinsic width, overflowing the dialog
  box at narrow viewports (320/375px) even though the box itself has a
  `max-w-[calc(100%-2rem)]` cap. Fixed app-wide with one class:
  `[&>*]:min-w-0` on `DialogContent` — verified no regression across other
  consumers (`email-verify-dialog`, `alert-dialog`, etc.). Any future dialog
  with a wide unwrapped row should NOT need its own fix now that the
  primitive itself is patched — but still worth a narrow-viewport Storybook
  check (`page.viewport()` real-resize, NOT the inert `parameters.viewport`
  addon in this repo) since QA caught this AFTER design-review/tech-lead/a11y
  all missed it — static/token-level design review does not catch grid
  min-width overflow, only a real-browser resize does.
