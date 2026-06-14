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
