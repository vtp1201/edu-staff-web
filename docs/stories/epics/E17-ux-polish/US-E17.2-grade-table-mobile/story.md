# US-E17.2 Grade Table Mobile Scroll

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: US-E17.5 (grade book empty state — the scroll wrapper structure established here is the container US-E17.5 will use)
- Feature module(s) chạm: `src/components/shared/grade-book-table/`
- Shared contract/file: `grade-book-table` shared component (used by teacher, principal, student, and parent grade routes)

## Product Contract

The `grade-book-table` shared component SHALL be fully usable on mobile (375 px and 320 px) via these three additions:
1. `-webkit-overflow-scrolling: touch` on the scroll wrapper (line 86) for iOS momentum scroll.
2. `min-w-[640px]` on the `<table>` element so columns are never crushed.
3. `border-r border-border` on all sticky first-column cells (lines 95 and 170) so a visible separator exists between the sticky column and scrolling content.

The scroll wrapper SHALL also have `role="region"` and `aria-label` from an existing i18n key.
No new tokens, no new i18n keys, no BE changes.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — key `responsiveGrid.gradeTable`
- `docs/stories/epics/E17-ux-polish/US-E17.2-grade-table-mobile/spec.md`
- `.claude/rules/design-system.md` — token rules (`bg-card`, `border-border`)

## Acceptance Criteria

- AC-01: At 375 px with data loaded — `overflow-x: auto` on wrapper; `<table>` computed width ≥ 640 px; horizontal scroll available in wrapper; no page-level horizontal overflow.
- AC-10: `-webkit-overflow-scrolling: touch` inline style present on same element as `overflow-x: auto`.
- AC-11: `<table>` computed width ≥ 640 px at 375 px.
- AC-12: `<table>` computed width ≥ 640 px at 320 px; `document.documentElement.scrollWidth === document.documentElement.clientWidth`.
- AC-06: Sticky `<th>` visible at left edge of scroll wrapper after scrolling 100 px right.
- AC-07: Sticky `<td>` cells have `position: sticky`, `left: 0`, `bg-card` background, `z-index: 1`.
- AC-08: Sticky first-column cells have `border-r border-border` (right separator).
- AC-03: Scroll wrapper has `role="region"` + `aria-label` from existing i18n key; zero new key additions.
- AC-09: Modal/popover z-index > 1; sticky column (z-index 1) covered by overlay.
- (Full AC list in spec.md §6.)

## Design Notes

- Commands: none
- Queries: none
- API: none
- Tables: none
- Domain rules: none
- UI surfaces:
  - `grade-book-table.tsx` line 86 (scroll wrapper div): add `style={{ WebkitOverflowScrolling: 'touch' }}`, `role="region"`, `aria-label={t('<existing-grades-key>')}`
  - `grade-book-table.tsx` `<table>` element: add `min-w-[640px]` to className
  - `grade-book-table.tsx` line 95 (sticky `<th>`): add `border-r border-border z-[1]` to className
  - `grade-book-table.tsx` line 170 (sticky `<td>`): add `border-r border-border z-[1]` to className
  - Storybook: add viewport story at 375 px for `grade-book-table` showing sticky column and horizontal scroll

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.2 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: assert `WebkitOverflowScrolling: 'touch'` in rendered wrapper inline styles; assert `min-w-[640px]` class on `<table>`; assert `border-r border-border` on sticky `<th>` and `<td>` cells; assert `role="region"` on wrapper |
| Integration | N/A — pure CSS/layout change; no HTTP boundary |
| E2E | Storybook interaction story at 375 px: scroll wrapper present, table width ≥ 640, sticky column visible after programmatic scroll; Playwright: `scrollWidth === clientWidth` at 320 px |
| Platform | Manual iOS Safari test (or BrowserStack) confirming momentum scroll decelerates naturally |
| Release | n/a |

## Harness Delta

No harness changes required. This story introduces no new endpoints, tokens, or i18n keys.
Confirm with `ba-lead` if an i18n key for `aria-label` must be added (see OQ-001 in spec.md).

## Evidence

Add Storybook screenshot links and Playwright reports after validation.
