# US-E17.1 Responsive Stat-Card Grid

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm:
  - `src/features/discipline/presentation/discipline-screen/`
  - `src/features/teacher/presentation/teacher-dashboard-home/`
  - `src/features/principal/presentation/principal-dashboard/`
  - `src/features/student/presentation/student-dashboard/`
  - `src/features/attendance/presentation/attendance-screen/`
- Shared contract/file: none

## Product Contract

All stat-card grids across discipline-screen (all tabs), teacher-dashboard-home, principal-dashboard, student-dashboard, and attendance-summary-card SHALL use `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` so that:
- viewports > 1024 px → 4 columns
- viewports 640–1024 px → 2 columns
- viewports < 640 px (including 375 px and 320 px) → 1 column, no horizontal overflow, no card narrower than 200 px.

No JavaScript breakpoint detection. No new design tokens. No new i18n keys. No BE changes.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — key `responsiveGrid.statGrid`
- `docs/stories/epics/E17-ux-polish/US-E17.1-responsive-stat-grid/spec.md`
- `.claude/rules/design-system.md` — spacing and StatCard token rules

## Acceptance Criteria

- AC-01: At 1280 px, stat-card grid shows 4 columns; no horizontal overflow; `grid-template-columns` = `repeat(auto-fit, minmax(200px, 1fr))`.
- AC-04: At 768 px, stat-card grid shows 2 columns; each card ≥ 200 px wide; no overflow.
- AC-08: At 375 px, stat-card grid shows 1 column; card width ≈ 343 px; no horizontal scrollbar.
- AC-09: At 320 px, stat-card grid shows 1 column; `document.documentElement.scrollWidth === document.documentElement.clientWidth`.
- AC-10: discipline-screen Conduct tab at 375 px → 1 column, no overflow.
- AC-11: discipline-screen Violations tab at 375 px → 1 column, no overflow.
- AC-13: DOM order of stat-card elements is identical at 320 px, 768 px, and 1280 px; tab order matches reading order.
- AC-14: Gap between cards is 16 px (`gap-4`) at all breakpoints; gap class is unchanged.
- AC-02: No `window.innerWidth`, `matchMedia`, or `ResizeObserver` calls introduced by this story.
- (Full AC list in spec.md §6.)

## Design Notes

- Commands: none (no server actions)
- Queries: none (no new data fetching)
- API: none
- Tables: none
- Domain rules: none
- UI surfaces:
  - `discipline-screen.tsx` line 61: replace `grid-cols-2 gap-3.5 lg:grid-cols-4` → `grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4`
  - `conduct-tab.tsx` line 109: same replacement
  - `violations-tab.tsx` line 167: same replacement
  - `teacher-dashboard-home.tsx` line 55: update `minmax(180px,1fr)` → `minmax(200px,1fr)`
  - `principal-dashboard.tsx` line 29: replace `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` → `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]`
  - `student-dashboard.tsx` line 25: same as principal
  - `attendance-summary-card.tsx` line 17: replace `grid-cols-2 sm:grid-cols-4` → `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]`
  - Storybook: add viewport story at 375 px for each affected component's story file

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.1 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: assert `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` class present on grid container for each affected component; assert no `grid-cols-4` / `lg:grid-cols-4` / `sm:grid-cols-4` remains |
| Integration | N/A — pure CSS change; no HTTP boundary |
| E2E | Storybook interaction stories at 375 px, 768 px, 1280 px asserting correct column count (via computed style or class presence); Playwright viewport test asserting `scrollWidth === clientWidth` at 320 px |
| Platform | Manual device-mode check in Chromium at 320 px and 375 px |
| Release | n/a |

## Harness Delta

No harness changes required. This story introduces no new endpoints, tokens, or i18n keys.

## Evidence

Design review: pass
- design-system: conform (no new tokens; `gap-4` normalized on grids that had `gap-3`/`gap-3.5`; StatCard untouched; per-feature grid containers correctly left in place, not duplicated — component-organization OK)
- a11y: WCAG AA OK (fe-accessibility-auditor, no findings) — DOM order unchanged across 320/768/1280px, no touch-target gap (StatCard has no interactive children on any of the 8 screens), no contrast/motion impact, no grid-flow/order scrambling
- impeccable audit: 0 findings — pure `grid-template-columns` utility change, no new visual/hierarchy decision in scope for critique
- states: responsive 320px/375px/768px/1280px covered by 39 passing unit tests (`responsive-stat-grid.test.ts` ×6) asserting exact class presence/absence per breakpoint target, plus Storybook `Viewport375` stories on attendance-screen, discipline-screen, exam-result, teacher-dashboard-home. `principal-dashboard.tsx`/`student-dashboard.tsx` are RSC with no `.stories.tsx` in this diff (flagged non-blocking — CSS-only change, covered by unit test); no loading/empty/error UI was touched by this story (layout-only)

Proof:
- `bunx tsc --noEmit` → exit 0
- `bun vitest run` → 195 files, 989 tests, all pass (targeted: 39/39 on the 6 new test files)
- `fe-tech-lead-reviewer` verdict: APPROVED
- `fe-accessibility-auditor` verdict: PASS, no findings
- Files touched: `attendance-summary-card.tsx`, `discipline-screen.tsx`, `conduct-tab.tsx`, `violations-tab.tsx`, `teacher-dashboard-home.tsx`, `principal-dashboard.tsx`, `student-dashboard.tsx`, plus `exam-result.tsx` (found beyond the original 7-file list via OQ-003 grep, same fix applied)
- Touch-target audit (FR-4/AC-16): N/A confirmed — no interactive elements inside any of the 8 stat-card grids
