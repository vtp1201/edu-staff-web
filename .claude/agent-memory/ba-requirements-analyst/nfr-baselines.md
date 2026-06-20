---
name: nfr-baselines
description: Confirmed NFR measurable targets for edu-staff-web — a11y, responsive, performance, i18n baselines used across all TR-XXX documents
metadata:
  type: user
---

# NFR Baselines for edu-staff-web

## Accessibility (WCAG 2.1 AA)
- Normal text contrast >= 4.5:1; large text / UI controls >= 3:1
- All interactive elements keyboard-navigable; focus ring always visible (`--ring`)
- Touch target >= 44×44px on mobile
- Modals: focus trap + `aria-labelledby`; Radix Dialog used for compound modals
- Icon-only buttons: Vietnamese `aria-label` required
- Disabled items: `aria-disabled="true"` (not `disabled`); hint text via `aria-describedby`
- Destructive actions: always behind at least one confirmation step (WCAG 3.3.4)
- Animation gate: `@media (prefers-reduced-motion: reduce)` required for all transitions

## Responsive
- No layout break at 320px; tested at 375 / 768 / 1280px
- Modals: max-height 92vh with internal scroll
- Panels (e.g., 320px info panel): full-width overlay with close affordance at 375px

## Performance
- Skeleton loading state: visible within 320ms of async trigger
- Optimistic UI for create/send mutations: synchronous list update before API response

## i18n
- All UI strings in `src/bootstrap/i18n/messages/{vi,en}.json` (vi = source, en mirror)
- Keys added to both files simultaneously
- Presentation translates; domain/use-case/infrastructure return stable key types
- `bunx tsc --noEmit` catches key drift at compile time
- Mock data, brand nouns, and code comments are NOT i18n'd

## Design tokens
- Only semantic tokens from `src/app/tokens.css` — no raw hex, no Tailwind palette names
- New tokens require PR to `tokens.css` + `globals.css @theme` + `docs/product/design-system.md` sync before use
