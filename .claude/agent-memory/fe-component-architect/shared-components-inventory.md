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
- No shared `FilterBar` or `DateRangeField` component exists — every feature (exam-bank, lesson-bank, staff-leave, audit-log) hand-rolls its own filter bar from `ui/select`+`ui/input`. `staff-leave-filters.tsx` has a `dateFrom`/`dateTo` pair with NO `from<=to` validation wired; audit-log (US-E12.12) is the first to need that validation — built feature-local as `DateRangeFields`, flagged for promotion to `components/shared/date-range-fields/` when a 2nd screen needs the same validated range.
- `ui/tabs` (`tabs.tsx`) has TWO variants already built into `tabsListVariants`: `default` (pill/bg-muted) and `line` (underline-on-active). Use the SAME `Tabs` primitive with different `variant` prop for visually-different tab groups on one screen (e.g. US-E11.6: course-list pill tabs vs player Notes/Q&A underline tabs) — do not invent a second tabs component just because the visual differs.
- No `Collapsible`/`Accordion` Radix primitive exists anywhere in `src/` (confirmed via grep, US-E11.6). For a single expand/collapse disclosure (e.g. chapter-list header), use a native `<button aria-expanded aria-controls>` + conditionally-rendered list — matches `Sidebar`'s existing hand-rolled nav-disclosure pattern (`sidebar.tsx`). Only justify `bun ui:add accordion` if a screen needs true single-open accordion semantics.
- `ui/progress` (`Progress`) takes an `indicatorClassName` prop for per-item tone (e.g. per-course color) — no need for a variant prop, just pass a semantic bg-* class.
- `shared/empty-state` (`EmptyState`) is the canonical empty-state for ALL empty variants on a screen (per-tab-empty, empty-list, no-results) — icon/title/body/cta props, `role="status"`, does not call `useTranslations` (caller injects translated strings). Reuse instead of hand-rolling centered icon+text blocks.
