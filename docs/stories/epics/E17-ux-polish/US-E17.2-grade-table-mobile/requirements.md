# Requirements — US-E17.2 Grade Table Mobile Scroll

## Requirements Summary

The grade-book table (`src/features/grades/presentation/grade-book-screen/`) currently overflows horizontally on viewports below ~640 px with no scroll affordance and no sticky first column, making it unusable on mobile for Student and Parent. This story adds `overflow-x: auto` with touch momentum scrolling on a wrapping container, enforces a minimum table width of 640 px, and makes the first column (student name / subject name) sticky at `left: 0` so context is preserved while scrolling. No BE changes, no new tokens, and no new i18n keys are required.

## Actors & Roles

| Role | Screen | Primary device |
|---|---|---|
| Student | `/student/grades` | Mobile |
| Parent | `/parent/grades` | Mobile |
| Teacher | `/teacher/grades` | Desktop (also benefits from tablet) |
| Principal | `/principal/grades` | Desktop / tablet |

Student and Parent are the primary mobile users and the primary beneficiaries of this fix.

## Functional Requirements

**TR-001** — Horizontal scroll wrapper
The system SHALL wrap the grade table in a scroll container that has `overflow-x: auto` and `-webkit-overflow-scrolling: touch`. This wrapper is applied at all viewports so the table always scrolls horizontally rather than overflowing its parent.
- Trigger: grade-book table render.
- Preconditions: grade table is rendered with at least one column of data.
- Postconditions: on viewports narrower than the table's natural width, a horizontal scrollbar (or touch-drag scroll) is available. No content is clipped.
- Error conditions: if the table renders in empty state (no grades), the scroll wrapper still exists but the empty-state component is rendered inside it (see US-E17.5).

**TR-002** — Minimum table width
The system SHALL apply a minimum width of 640 px to the `<table>` (or equivalent grid-table component) so that columns are never squeezed below their readable minimum.
- Trigger: table render on any viewport.
- Preconditions: none.
- Postconditions: table computed width ≥ 640 px regardless of viewport width.
- Error conditions: none (CSS min-width, no runtime path).

**TR-003** — Sticky first column
The system SHALL apply `position: sticky; left: 0` to every cell in the first column (header cell and all data cells) so that the student/subject identifier remains visible while the user scrolls horizontally.
- Trigger: table render.
- Preconditions: table has at least 2 columns.
- Postconditions: first-column cells stay anchored to `left: 0` during horizontal scroll. Background of sticky cells is `var(--edu-card)` to cover scrolling content behind them. A `1px solid var(--edu-border)` right border visually separates the sticky column.
- Error conditions: on browsers that do not support `position: sticky` (legacy) the column scrolls normally — this is acceptable graceful degradation.

**TR-004** — Sticky column z-index layering
The system SHALL apply `z-index: 1` to sticky first-column cells so they render above scrolling body cells. The z-index SHALL NOT exceed 1 to avoid conflicting with modal/popover layers.
- Trigger: table render.
- Preconditions: TR-003 sticky is applied.
- Postconditions: sticky column cells visually occlude scrolling cells as the user scrolls right.
- Error conditions: none.

**TR-005** — Touch target for table row actions
Any interactive element within a table row (e.g. grade drill-down button, row action icon) SHALL have a minimum touch target of 44 × 44 px when the table is rendered on a viewport < 640 px.
- Trigger: table render on mobile viewport.
- Preconditions: table contains row-level interactive elements.
- Postconditions: all interactive table elements meet 44 × 44 px touch target.
- Error conditions: none.

**TR-006** — Scroll container padding reset
The system SHALL set `padding: 0` on the scroll wrapper container (the element with `overflow-x: auto`) so the table starts flush with the container edge and the sticky column does not have a gap on the left.
- Trigger: table render.
- Preconditions: the parent component applies horizontal padding.
- Postconditions: the scroll container has no internal horizontal padding; page-level padding is applied outside the scroll wrapper.
- Error conditions: none.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA)**
The sticky-column technique MUST NOT alter the DOM order of `<th>` / `<td>` elements. Screen readers traverse the table in DOM order; visual stickiness does not affect this. The scroll container SHALL have `role="region"` and an accessible name (via `aria-label` using an existing i18n key for "grade table") so keyboard users can identify the scrollable region. Measurable target: table DOM order is unchanged; scroll container has `role="region"` + `aria-label`; no WCAG 1.3.1 failure.

**TR-NFR-002 — Responsive (no break at 320 px)**
The table SHALL NOT overflow its page at 320 px viewport — the horizontal scroll wrapper absorbs all overflow. Measurable target: at 320 px Chromium device-mode, `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no page-level horizontal scroll).

**TR-NFR-003 — Touch momentum scrolling**
`-webkit-overflow-scrolling: touch` SHALL be applied so that touch-drag scrolling on iOS Safari decelerates naturally (momentum scroll). Measurable target: confirmed via manual iOS Safari test or BrowserStack.

**TR-NFR-004 — i18n**
No new i18n keys are introduced. The `aria-label` on the scroll container re-uses an existing key. Measurable target: `vi.json` and `en.json` diff shows zero new key additions for this story.

[ASSUMPTION] The `aria-label` key for the grade table scroll region already exists (e.g. under `grades.gradeBook.*`) or will be added as part of the a11y fix using an existing label key. If no suitable key exists, `ba-integration-analyst` should flag this to `ba-lead` for a targeted i18n key addition.

## Scope Boundary

**IN scope:**
- `src/features/grades/presentation/grade-book-screen/` — table wrapper and first-column cells.
- Applies to all role variants of the grade-book screen (teacher, principal, student, parent) since they share the same table component.

**OUT of scope:**
- Grade Entry screen (`/teacher/grades/enter`) — that is a data-entry form, not a read-only table; separate concern.
- Grade Approval screen — separate story.
- Empty state for the grade table — covered in US-E17.5.
- Column sorting or filtering — not part of this story.
- BE changes, new routes, new design tokens, new i18n keys.

**External dependencies:**
- None. Pure CSS/layout change on the existing presentation component.

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001, TR-002, TR-003 | Without these three the table is unusable on mobile — core fix |
| Must | TR-004, TR-006 | z-index and padding are required correctness constraints for sticky column |
| Must | TR-NFR-001, TR-NFR-002 | WCAG AA and no-page-overflow are "done" criteria |
| Should | TR-005 | Touch targets on row actions — applies only if interactive elements exist in rows |
| Should | TR-NFR-003 | Touch momentum is a strong UX quality signal on iOS |
| Could | — | Column width tuning per subject count |
| Won't | Column freezing beyond first column | Out of scope; no design spec for multi-column sticky |

## Design Spec Reference

`docs/product/design-spec.jsonc` key: `responsiveGrid.gradeTable`

Normative values: `overflowX: 'auto'`, `WebkitOverflowScrolling: 'touch'`, `minWidth: '640px'`, first column `position: sticky, left: 0, background: var(--edu-card), zIndex: 1, borderRight: '1px solid var(--edu-border)'`, `padding: '0'`.
