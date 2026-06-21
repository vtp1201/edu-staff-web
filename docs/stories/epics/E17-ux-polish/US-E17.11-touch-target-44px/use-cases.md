# US-E17.11 — Touch Target ≥44px: Use Cases & Acceptance Criteria

**Story ID:** US-E17.11
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**UC Author:** ba-use-case-modeler

---

## 1. Use Case Scope Summary

**Total UCs:** 4
**Actors:** Teacher, Principal, Student, Parent (all interact with grade tables; Teacher/Principal interact with violation rows)
**System boundary:** Layout-only changes to two files:
- `src/components/shared/grade-book-table/grade-book-table.tsx` — `min-h-[44px]` on data row cells + sticky first column (z-10, bg-card, left:0)
- `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` — `py-2.5 min-h-[44px]` on violation row containers
No BE integration. No new design tokens. No i18n changes.

**Dependency:** US-E17.2 adds horizontal-scroll wrapper + `min-w-[640px]` to the grade table. US-E17.11's sticky first column (FR-002) requires that horizontal-scroll wrapper to be present. FE must coordinate branch ordering or implement both on the same branch.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in Scope |
|---|---|---|
| Teacher | Human, internal | Interacts with grade table rows (grade entry view) and discipline violation rows on mobile |
| Principal | Human, internal | Interacts with grade table rows (read-only) and discipline violation rows on mobile |
| Student | Human, internal | Interacts with grade table rows in student grade view on mobile |
| Parent | Human, external | Interacts with grade table rows in parent grade view on mobile |

---

## 3. Use Case Catalogue

### UC-E17.11-001 — Grade Table Data Rows at 44px Minimum Height

**Primary Actor:** Teacher / Principal / Student / Parent
**Preconditions:**
1. Grade book table is rendered (any consumer: teacher grade entry, parent grade view, student grade view).
2. Table has data rows.

**Main Success Scenario:**
1. Each `<td>` or row container in the grade table has `min-h-[44px]` (Tailwind `min-h-11`).
2. On a 375px viewport, every row is visually at least 44px tall.
3. If a cell's content is taller than 44px, the row expands to fit content (min-height, not fixed height).
4. Desktop layout is unaffected (rows are naturally at least 44px due to content; no jarring additional spacing).

**Alternative Flows:**
- A1 (Desktop density concern): If adding `min-h-[44px]` unconditionally causes unacceptable density on desktop (e.g. 30+ rows at 44px minimum), FE scopes the constraint to mobile using `md:min-h-auto`, but the mobile minimum is never removed.

**Exception Flows:**
- E1 (US-E17.2 not yet merged): If the horizontal-scroll wrapper from US-E17.2 is absent, the grade table still gets `min-h-[44px]` on rows. The sticky column (UC-E17.11-002) is the part with the hard dependency on US-E17.2.

---

### UC-E17.11-002 — Sticky First Column During Horizontal Scroll

**Primary Actor:** Teacher / Principal / Student / Parent
**Preconditions:**
1. Grade table has horizontal overflow (from US-E17.2's `min-w-[640px]` wrapper).
2. Grade table has a sticky first column (`position: sticky; left: 0; bg-card; z-10`).
3. Viewport is 375px (mobile) and the table overflows horizontally.

**Main Success Scenario:**
1. User scrolls the grade table horizontally on a 375px viewport.
2. The first column (student name or row label) remains fixed (sticky) while other columns scroll underneath.
3. The sticky column has `z-10` — lower than modal/dialog z-index; no z-index collision with any overlay.
4. The first column header cell also remains sticky (if the table header is separately sticky).

**Exception Flows:**
- E1 (US-E17.2 not merged): Without the horizontal-scroll wrapper (`min-w-[640px]`), the sticky column has no scrollable context and appears as a normal column. FE must document this dependency in the branch claim check.
- E2 (z-index collision with modal/dialog): Sticky column z-index (z-10) must be verified lower than any overlay modal/dialog z-index; if collision occurs FE adjusts the layering.

---

### UC-E17.11-003 — Discipline Violation Rows at 44px Minimum Height

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. Discipline screen is rendered.
2. At least one violation row is present in the violation log.

**Main Success Scenario:**
1. Each violation row container has `py-2.5 min-h-[44px]`.
2. On a 375px viewport, each violation row is at least 44px tall.
3. `py-2.5` provides visual vertical separation between rows.
4. If violation content is taller than 44px, the row expands naturally.

**Alternative Flows:**
- A1 (student-conduct-screen.tsx): If `student-conduct-screen.tsx` uses the same violation row markup as `discipline-screen.tsx`, the same `py-2.5 min-h-[44px]` classes are applied to that file as well.

---

### UC-E17.11-004 — Icon-Only Action Buttons Within Rows

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. Grade table rows or violation rows contain icon-only action buttons (edit, delete triggers).

**Main Success Scenario:**
1. Each icon-only action button has `min-h-[44px]` and `min-w-[44px]`.
2. On a 375px viewport, each icon-only button is independently tappable without triggering the row.
3. The button's touch target does not overlap adjacent interactive elements causing accidental taps.

---

## 4. Acceptance Criteria

### UC-E17.11-001: Grade Table Row Height

**AC-E17.11-01 — Mobile: grade table data rows are ≥44px tall**
Given the grade book table is rendered on a 375px viewport with at least one data row,
When the layout is measured,
Then every `<td>` or row container in the table body has a computed height of at least 44px,
Using `min-h-[44px]` (min-h-11 Tailwind class).

**AC-E17.11-02 — All consumers: change propagates from shared component**
Given `grade-book-table.tsx` is the shared canonical implementation used by teacher grade entry, parent grade view, and student grade view,
When `min-h-[44px]` is added to the row cells,
Then all three consumer screens inherit the 44px minimum without individual file changes.

**AC-E17.11-03 — Row expands with content taller than 44px**
Given a grade table row has content (text or embedded elements) that is taller than 44px,
When the row renders,
Then the row expands to fit the content (min-height, not a fixed height that clips content).

**AC-E17.11-04 — Desktop: density not unacceptably degraded**
Given the grade table has 30 rows at `min-h-[44px]`,
When rendered on a 1280px viewport,
Then the table body height of approximately 1320px is within normal scroll context on desktop,
Or if the FE team determines density is unacceptable, `md:min-h-auto` is applied to restore natural desktop row height while mobile min-h-[44px] is preserved.

**AC-E17.11-05 — No new design tokens required**
Given the implementation is reviewed,
Then only Tailwind utility classes (`min-h-11`, `py-2.5`, `sticky`, `z-10`, `bg-card`) are used,
And zero new entries are added to `src/app/tokens.css`.

---

### UC-E17.11-002: Sticky First Column

**AC-E17.11-06 — Mobile: first column stays visible during horizontal scroll**
Given the grade table has horizontal overflow (min-w-[640px] from US-E17.2) and the viewport is 375px,
When the user scrolls the table horizontally,
Then the first column (student name or row label) remains fixed in its original position,
And the remaining columns scroll underneath it.

**AC-E17.11-07 — Sticky column uses correct CSS properties**
Given the grade table first column cell is inspected,
Then it has `position: sticky`, `left: 0`, `background-color: var(--card)` (bg-card), and `z-index: 10` (z-10).

**AC-E17.11-08 — No z-index collision with dialogs or overlays**
Given the sticky column has `z-10`,
When a modal dialog or overlay is displayed on top of the table,
Then the dialog/overlay renders above the sticky column without visual clipping or collision.

**AC-E17.11-09 — Dependency: sticky column requires US-E17.2 horizontal-scroll wrapper**
Given US-E17.2 (horizontal scroll, `min-w-[640px]`) has NOT been merged,
When US-E17.11 is implemented in isolation,
Then the sticky column has no visible effect (no scrollable context),
And FE documents this in the branch claim check per parallel-workflow.md dependency rules.

---

### UC-E17.11-003: Discipline Violation Row Height

**AC-E17.11-10 — Mobile: violation rows are ≥44px tall**
Given the discipline screen violation log is rendered on a 375px viewport with at least one violation,
When the layout is measured,
Then each violation row container has a computed height of at least 44px,
Using `min-h-[44px]` (min-h-11) and `py-2.5` Tailwind classes on the row element.

**AC-E17.11-11 — Vertical padding provides visual row separation**
Given violation rows have `py-2.5` applied,
When the violation log renders with multiple rows,
Then adequate vertical space (top and bottom padding of 10px = 2.5 in Tailwind) is visible between each row,
Improving readability and reducing mis-taps on adjacent rows.

**AC-E17.11-12 — student-conduct-screen aligned if same markup**
Given the FE team verifies that `student-conduct-screen.tsx` uses the same violation row markup,
When `py-2.5 min-h-[44px]` is applied,
Then both `discipline-screen.tsx` and `student-conduct-screen.tsx` violation rows meet 44px minimum.

---

### UC-E17.11-004: Icon-Only Action Buttons

**AC-E17.11-13 — Icon-only buttons meet 44×44px minimum**
Given a grade table row or violation row contains an icon-only action button (edit, delete),
When rendered on any viewport,
Then the button has `min-h-[44px]` and `min-w-[44px]`,
And the button is independently tappable without triggering the row-level interaction.

**AC-E17.11-14 — Icon-only buttons are individually reachable by keyboard**
Given a table row contains icon-only action buttons,
When the user navigates via Tab,
Then each icon-only button receives focus independently,
And a visible focus ring (using `--ring` token) is shown on each button.

---

### Regression: US-E17.2 Compatibility

**AC-E17.11-15 — No regression on US-E17.2 changes**
Given US-E17.2 has added `-webkit-overflow-scrolling: touch`, `min-w-[640px]` to the grade table wrapper, and `border-r` on the sticky column,
When US-E17.11 adds `min-h-[44px]` to row cells and `z-10 bg-card` to the sticky column,
Then the US-E17.2 changes are still present and functional (horizontal scroll works, border-r on first column is visible),
And the two sets of changes are non-conflicting in the rendered DOM.

---

## 5. Edge Case Matrix

| Scenario | 375px | 768px | 1280px | US-E17.2 not merged | z-index collision | 30-row density | icon-only button | student-conduct-screen |
|---|---|---|---|---|---|---|---|---|
| Grade row min-h | ≥44px | ≥44px (or natural) | natural (md:min-h-auto optional) | min-h still applied | N/A | ~1320px total (FE decides) | N/A | N/A |
| Sticky first col | visible during scroll | visible during scroll | visible during scroll | not functional (no scroll context) | z-10 < modal/dialog | visible | N/A | N/A |
| Violation row min-h | ≥44px py-2.5 | ≥44px py-2.5 | ≥44px py-2.5 | N/A | N/A | N/A | N/A | same markup = same fix |
| Icon-only buttons | 44×44px | 44×44px | 44×44px | N/A | N/A | N/A | min-h-[44px] min-w-[44px] | N/A |
| New tokens | none | none | none | none | none | none | none | none |

---

## 6. Open Questions

**OQ-E17.11-01** [OPEN QUESTION] Should `min-h-[44px]` on grade table row cells be applied unconditionally to all viewports, or scoped to below the `md` breakpoint? DR-011 allows unconditional application (44px is not visually jarring on desktop). FE team to verify desktop density with a real 30-row grade table and apply `md:min-h-auto` if needed. Outcome must be documented in the implementation commit.

**OQ-E17.11-02** [OPEN QUESTION] Does `student-conduct-screen.tsx` use the same violation row markup as `discipline-screen.tsx`? If yes, FR-003 applies to both files. FE team must verify at implementation and update the scope of changes accordingly.
