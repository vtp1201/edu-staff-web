---
name: pattern-detail-panel-header
description: Canonical DetailPanelHeader shared component + responsive icon-only action-label collapse pattern
metadata:
  type: project
---

`components/shared/detail-panel-header/` — canonical 3-zone back-nav header
(back button left / optional title center / optional actions right). Props:
`backLabel` (req, used as text AND untruncated `aria-label`), `onBack` (req),
`title?`, `actions?: ReactNode`. Back = ghost Button + ChevronLeft, `min-h-[44px]
min-w-[44px] flex-shrink-0`; title wrapper `min-w-0 flex-1` truncates; actions
`flex-shrink-0`. Consumers: announcements detail-sheet, messaging group-info-panel,
exam-bank builder-action-bar.

**Responsive icon-only action labels (US-E17.9 resolution):** spec.md literally
said `md:hidden` on action label spans, but that hides labels at md+ (backwards).
Correct class for "icon-only below md, labeled at md+" is
`<span className="sr-only md:not-sr-only">Label</span>` on an action button that
ALSO carries its own `aria-label` — keeps the accessible name on mobile while
collapsing the visible label. The DetailPanelHeader does NOT collapse labels
itself; that's the caller's job (documented in the component's `actions` prop
JSDoc). Flag spec `md:hidden` wording as a doc bug, not a behavior change.

**Sheet + replacement header:** when swapping a `SheetHeader` visual title for a
custom header, keep `SheetTitle`/`SheetDescription` but wrap the `SheetHeader` in
`className="sr-only"` — Radix still needs them for a11y. Controlled Sheet returns
focus to the last-focused trigger natively on close (no manual focus-return code).

**renderToStaticMarkup gotcha:** to assert visible label ordering vs icon, match
the text node `">Label<"` not the bare string — the bare string also matches the
earlier `aria-label="Label"` attribute occurrence. See [[pattern-node-env-component-test]].
