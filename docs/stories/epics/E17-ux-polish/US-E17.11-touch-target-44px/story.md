# US-E17.11 Touch Target ≥44px on Mobile

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none (but sticky column has a functional dependency on US-E17.2's horizontal-scroll wrapper; see §FR-002)
- Blocks: none
- Feature module(s) chạm:
  - `src/components/shared/grade-book-table/grade-book-table.tsx` (min-h + sticky column)
  - `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` (violation rows)
  - `src/features/student/presentation/student-conduct-screen/student-conduct-screen.tsx` (FE audits — may need same fix)
- Shared contract/file: `src/components/shared/grade-book-table/grade-book-table.tsx` — **CROSS-REFERENCE US-E17.2 (same file, non-overlapping changes — claim check required per parallel-workflow.md)**

## Product Contract

Interactive rows in the grade-book table and discipline violation log meet WCAG 2.5.5 AA minimum 44×44px touch target on mobile. Grade table data row cells get `min-h-[44px]`. The grade table first column gets `position: sticky; left: 0; bg-card; z-10` for mobile horizontal-scroll usability. Violation rows get `py-2.5 min-h-[44px]`. Icon-only action buttons in affected rows get `min-h-[44px] min-w-[44px]`. No new design tokens — Tailwind utility classes only.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-08
- `docs/product/design-spec.jsonc` → `interactionPatterns.touchTarget`
- `docs/stories/epics/E17-ux-polish/US-E17.11-touch-target-44px/spec.md`
- `docs/stories/epics/E17-ux-polish/US-E17.2-grade-table-scroll/` (cross-reference — same file)

## Acceptance Criteria

- AC-E17.11-01: Grade table data rows have computed height ≥44px on a 375px viewport.
- AC-E17.11-02: Change in `grade-book-table.tsx` propagates to teacher grade entry, parent grade view, and student grade view without individual file changes.
- AC-E17.11-06: When grade table has horizontal overflow, first column stays visible (sticky) during horizontal scroll on 375px viewport.
- AC-E17.11-07: First column cells have `position: sticky`, `left: 0`, `background-color: var(--card)`, `z-index: 10`.
- AC-E17.11-10: Discipline violation rows have computed height ≥44px with `py-2.5` on 375px viewport.
- AC-E17.11-13: Icon-only action buttons in rows have `min-h-[44px]` and `min-w-[44px]`.
- AC-E17.11-15: US-E17.2 changes (horizontal scroll, `border-r` on sticky col) are not regressed by this story.
- AC-E17.11-05: Zero new entries in `src/app/tokens.css`; only Tailwind utilities used.

## Design Notes

- Commands: none
- Queries: none (layout-only changes)
- API: none
- Tables: none
- Domain rules: `min-h-[44px]` applied unconditionally by default; FE may add `md:min-h-auto` for desktop density only after verifying a 30-row table is unacceptably dense — decision documented in commit
- UI surfaces:
  - Modify: `src/components/shared/grade-book-table/grade-book-table.tsx` — add `min-h-[44px]` to data rows; ensure first column has `sticky left-0 bg-card z-10`
  - Modify: `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` — add `py-2.5 min-h-[44px]` to violation row containers
  - Audit: `src/features/student/presentation/student-conduct-screen/student-conduct-screen.tsx` — apply same if same markup
  - Update: Storybook stories with 375px viewport assertions
- i18n keys: none required

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.11 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: `min-h-[44px]` class on grade table row cells; `sticky left-0 bg-card z-10` on first column; `py-2.5 min-h-[44px]` on violation row containers |
| Integration | None |
| E2E | Storybook interaction: 375px viewport asserting ≥44px row height; sticky column visible during horizontal scroll |
| Platform | Manual 375px device-mode check for touch target size and sticky column behavior |
| Release | n/a |

## Harness Delta

No harness changes required. No new endpoints, tokens, or i18n keys.

## Evidence

Add Storybook screenshot links after implementation.
