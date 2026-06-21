# Requirements — US-E17.1 Responsive Stat-Card Grid

## Requirements Summary

All stat-card grids across implemented screens (discipline-screen, teacher dashboard, student dashboard, principal dashboard) currently use `repeat(4, 1fr)` which breaks to a single cramped row at 375 px. This story replaces that pattern with `repeat(auto-fit, minmax(200px, 1fr))` so the grid collapses naturally to 2 columns at 640–1024 px and 1 column below 640 px, without JS breakpoint detection. No new tokens, no new i18n keys, and no BE changes are required. The fix is a pure CSS layout change to existing presentation components.

## Actors & Roles

| Role | Screen | Primary device |
|---|---|---|
| Teacher | Teacher Dashboard (`/teacher`) | Desktop + tablet |
| Principal | Principal Dashboard (`/principal`) | Desktop + tablet |
| Student | Student Overview (`/student`) | Mobile-first |
| Parent | Parent Overview (`/parent`) | Mobile-first |

Parent and Student are the primary mobile users; Teacher and Principal fixes primarily benefit tablet viewports.

## Functional Requirements

**TR-001** — Stat-grid CSS pattern replacement
The system SHALL replace every `repeat(4, 1fr)` (or any hard-coded `repeat(N, 1fr)` with N > 1) stat-card grid with `repeat(auto-fit, minmax(200px, 1fr))` across: `discipline-screen`, teacher dashboard, student dashboard, and principal dashboard stat-grid sections.
- Trigger: page render at any viewport width.
- Preconditions: screen is rendered with stat cards present (non-empty data state).
- Postconditions: at >1024 px the grid shows 4 columns; at 640–1024 px it shows 2 columns; at <640 px (including 375 px) it shows 1 column. No horizontal overflow. No card clipping.
- Error conditions: if a stat-card component receives no data the grid still renders with the correct number of skeleton/loading cards in the same responsive layout.

**TR-002** — Column count at normative breakpoints
The system SHALL produce the following column counts for stat-card grids at the three defined viewport widths:
- >1024 px: 4 columns (`minmax(200px, 1fr)` with sufficient width)
- 640–1024 px: 2 columns
- <640 px: 1 column
- Trigger: viewport resize (live) and initial render.
- Preconditions: none.
- Postconditions: column count matches spec at each breakpoint range.
- Error conditions: none (CSS-only, no runtime error path).

**TR-003** — Gap preservation
The system SHALL maintain a 16 px gap between stat cards at all breakpoints. The gap value comes from the existing design-system spacing token and MUST NOT be changed.
- Trigger: grid render.
- Preconditions: none.
- Postconditions: gap between cards is 16 px in all column configurations.
- Error conditions: none.

**TR-004** — Card minimum width enforcement
The system SHALL ensure no stat card is rendered narrower than 200 px. At 375 px viewport with 16 px horizontal padding on each side, a single-column card occupies 343 px (375 − 32), satisfying the 200 px floor.
- Trigger: grid render at any viewport.
- Preconditions: page-level horizontal padding of 16 px on each side is applied.
- Postconditions: each stat card is ≥ 200 px wide.
- Error conditions: none.

**TR-005** — Touch target on stat-card interactive elements
If any stat card contains a clickable/tappable element (e.g. drill-down link, info tooltip trigger), the system SHALL ensure its touch target is ≥ 44 × 44 px on all mobile viewports.
- Trigger: render on viewport < 640 px.
- Preconditions: stat card contains an interactive element.
- Postconditions: interactive element touch target ≥ 44 × 44 px.
- Error conditions: none.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA)**
The responsive grid MUST NOT alter DOM order. Visual order and reading/tab order SHALL remain identical after the grid reflows. `auto-fit` CSS does not reorder DOM nodes — this constraint is maintained automatically. Measurable target: tab order matches visual column-then-row order at all breakpoints; no accessibility tree order regression.

**TR-NFR-002 — Responsive (no layout break at 320 px)**
The grid SHALL NOT produce horizontal scroll or overflowed content at 320 px viewport width. At 320 px with 16 px side padding the available width is 288 px — the single-column card occupies 288 px, which exceeds the 200 px `minmax` floor. Measurable target: no `overflow-x: auto` scroll wrapper needed; Chromium device-mode at 320 px shows no horizontal scroll.

**TR-NFR-003 — Performance (no JS layout detection)**
The responsive behaviour SHALL be achieved via CSS `auto-fit minmax` only, with zero JavaScript media-query listeners or resize observers. Measurable target: no `window.innerWidth` / `matchMedia` calls added by this story.

**TR-NFR-004 — i18n**
No new i18n keys are introduced by this story. Measurable target: `vi.json` and `en.json` diff shows zero additions for this story.

## Scope Boundary

**IN scope:**
- Replacing `repeat(4, 1fr)` (and equivalent hard-coded N-column) stat-card grids in:
  - `src/features/discipline/presentation/discipline-screen/` (line ~142 and ~314 per DR-010)
  - Teacher dashboard component (`src/features/teacher/presentation/`)
  - Student overview component (`src/features/student/presentation/`)
  - Principal dashboard component (`src/features/principal/presentation/`)
- Verifying the fix at 375 px, 768 px, and 1280 px (the three normative viewport checkpoints).

**OUT of scope:**
- Any non-stat-card grid (e.g. class-list tables, lesson-bank card grid — separate stories).
- Loading skeleton layout (FE team applies same grid class to skeleton; no separate spec needed).
- BE changes, new routes, new design tokens, new i18n keys.
- Grade table layout — covered in US-E17.2.
- Messaging layout — covered in US-E17.3.

**External dependencies:**
- None. Pure CSS change on existing components.

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001, TR-002 | Core fix — current layout is broken on primary mobile viewports for Student/Parent |
| Must | TR-003, TR-004 | Preserve design-system gap and minimum card width; violations break visual hierarchy |
| Must | TR-NFR-001, TR-NFR-002 | WCAG AA and no-break-at-320 are "done" criteria per accessibility.md |
| Should | TR-005 | Touch target applies only if stat cards have interactive elements; may be N/A for some screens |
| Should | TR-NFR-003 | CSS-only constraint prevents future regression; easy to satisfy with the prescribed implementation |
| Could | — | Additional viewport testing beyond 375/768/1280 |
| Won't | JS-based breakpoint system | Explicitly excluded in DR-010 design spec |

## Design Spec Reference

`docs/product/design-spec.jsonc` key: `responsiveGrid.statGrid`

Normative implementation value: `gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'`

Breakpoints table: `responsiveGrid.statGrid.breakpoints` (>1024 px = 4 cols, 640–1024 px = 2 cols, <640 px = 1 col).
