---
name: polish-patterns
description: Recurring patterns for UX-polish stories — empty states, responsive grid, motion-safe transitions, sticky table columns
metadata:
  type: feedback
---

## Empty State Pattern (emptyStatePattern)

Canonical empty state from `docs/product/design-spec.jsonc § emptyStatePattern`:
- Container: `role="status"`, centered column, `padding: 40px 20px`
- Icon: 64px, `var(--edu-text-muted)`, `aria-hidden="true"` (decorative — passes WCAG because icon alone does not convey meaning)
- Title: 16px/700, `var(--edu-text-primary)` (9.4:1 contrast — PASS), `margin-top: 16px`, rendered as `<p>` not heading
- Body (if present): 13px, max-width 320px, `margin-top: 8px` — **use `var(--edu-text-secondary)` (5.1:1), NOT `var(--edu-text-muted)` (3.08:1)** — 13px regular text requires ≥4.5:1 per WCAG 1.4.3
- CTA (optional): `variant="primary"`, min 44px touch target (WCAG 2.5.5)
- State machine: loading → empty → populated → error (exactly one at a time)

**Why:** DR-010 impeccable audit flagged muted body text at 13px as WCAG 1.4.3 failure; design-spec advisory updated.
**How to apply:** Whenever specifying empty-state body text color, always mandate `var(--edu-text-secondary)` for body. Icon contrast advisory is moot (decorative). Title always uses `var(--edu-text-primary)`.

## Responsive Stat-Grid

Use `repeat(auto-fit, minmax(200px, 1fr))` — NOT `repeat(4, 1fr)`. Collapses to 2 cols at ~640px, 1 col at ~440px with no JS. Gap: 16px. Works at 320px viewport with 16px side padding.

**Why:** Hard-coded `repeat(4,1fr)` breaks at 375px on mobile.
**How to apply:** Any FR specifying a stat-card grid must mandate the auto-fit pattern and the three breakpoint thresholds (>1024 = 4 col, 640–1024 = 2 col, <640 = 1 col).

## Grade Table Mobile Scroll

Scroll wrapper: `overflow-x: auto`, `-webkit-overflow-scrolling: touch`. Table: `min-width: 640px`. First column: `position: sticky; left: 0; background: var(--edu-card); z-index: 1; border-right: 1px solid var(--edu-border)`. Padding on scroll wrapper: 0. Scroll wrapper needs `role="region"` + `aria-label` for a11y.

## Messaging Single-Pane Mobile

≤768px: show one panel at a time. Default = conversation list. Tap conversation → chat pane slides in full-width (transform 0.25s ease). Back button returns to list. `prefers-reduced-motion: reduce` → instant show/hide (no transform). Off-screen panel: `aria-hidden="true"` or `inert` to keep keyboard out of hidden panel.

## Motion-Safe Guard

Any transform/transition animation MUST be gated: `@media (prefers-reduced-motion: reduce) { /* instant show/hide, no animation */ }`. Applies to messaging pane slide and any other decorative transitions.
