---
name: shared-components-inventory
description: Inventory of components/shared and components/ui primitives confirmed present in the codebase
metadata:
  type: project
---

## components/shared (confirmed)

- `stat-card/` — StatCard with variants: default (icon box 52x52), compact, mini. Tones: primary/success/warning/error/info/purple/teal/muted.
- `status-badge/` — StatusBadge. Tones: primary/success/warning/error/info/purple/teal/muted. WCAG-aware token classes (decision 0027). Uses `Badge` primitive internally.

After US-E13.1:
- `gender-badge/` — PROMOTED from admin-roster. Props: `gender`, `femaleLabel`, `maleLabel`. 22x22 circular badge.

## components/ui (confirmed present — no bun ui:add needed)

button, input, select, calendar, card, pagination, skeleton, badge, tabs, dialog,
alert-dialog, avatar, scroll-area, switch, checkbox, toggle-group, popover, sonner,
table, dropdown-menu, sheet, form, textarea, label, separator, progress, toggle, tooltip.

## components/layout

Sidebar, Header, DashboardLayout — shell components.

## Notes

- `tooltip` is present — no `bun ui:add tooltip` needed for any story using Tooltip.
- `avatar` is present — Avatar + AvatarFallback usable without installation.
- `pagination` primitive exists at `ui/pagination/` — but admin-roster uses its own
  `RosterPagination` pattern (coupled to adminRoster i18n). Do not confuse.
- `StatusBadge` does NOT have a `destructive` tone. Design-spec uses `#B91C1C` for
  severity=high violations. Current fallback: use `error` tone and flag at design-review
  gate. A new `destructive` tone on StatusBadge needs ADR ≥ 0023.
- `StatCard variant="compact"` is the right pattern for conduct-grade summary counts
  (no new shared component needed — 4-up grid of compact cards).
- `sonner` primitive exists at `ui/sonner/` — use `toast()` from the `sonner` package
  directly (provider already wired in dashboard layout). Do NOT add a custom `useState toast`
  pattern in new screens; prefer `toast()` call (US-E09.3 decision).
- `StatusBadge` covers all leave-type tones (annual=primary, sick=warning, personal=muted,
  family=purple) and actor-role tones (teacher=primary, staff=muted) — no new tones needed.
- `scroll-area` is confirmed present — use `<ScrollArea>` for chat window + conversation list in messaging (US-E10.1).
- Messaging feature (US-E10.1): all 10 components are feature-local in `features/messaging/presentation/`. None promoted to shared yet (first screen). Promote if a second screen reuses any pattern.
