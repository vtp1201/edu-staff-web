# Use Cases — US-E17.2 Grade Table Mobile Scroll

---

## 1. Use Case Scope Summary

**Total UCs:** 7
**Actors:** Teacher, Principal, Student, Parent (all share the same `grade-book-table` component); Admin (if access is granted — role-gated upstream).
**Boundary:** CSS/layout additions to `src/components/shared/grade-book-table/grade-book-table.tsx`. Adds: `-webkit-overflow-scrolling: touch` on scroll wrapper, `min-width: 640px` on `<table>`, `border-right: 1px solid var(--edu-border)` on sticky first-column cells, and `role="region"` + `aria-label` on the scroll container. No BE changes, no new routes, no new design tokens. One i18n key may be needed for the scroll region `aria-label` — confirmed as an existing key reuse (see Open Questions).

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities |
|---|---|---|
| Student | Human | Views grade table on mobile; primary beneficiary |
| Parent | Human | Views grade table on mobile; primary beneficiary |
| Teacher | Human | Views and edits grade table; primarily desktop but benefits on tablet |
| Principal | Human | Views grade table reports; desktop/tablet |
| Admin | Human | Views grade table if role access permits; desktop |
| Browser / iOS Safari | System | Evaluates sticky positioning, overflow-x, and -webkit-overflow-scrolling |

---

## 3. Use Case Catalogue

---

### UC-01: Grade table scrolls horizontally on mobile (375 px)

**Goal:** On mobile viewports the grade table scrolls horizontally within its container so all columns are reachable without the page itself scrolling sideways.
**Primary Actor:** Student / Parent
**Preconditions:**
- User is authenticated with Student or Parent role.
- User navigates to the grade book screen.
- Viewport width is ≤ 375 px.
- Grade data is present (at least one student row and more than two grade columns so that the natural table width exceeds viewport width).

**Main Success Scenario:**
1. Browser renders the grade-book table inside a scroll wrapper that has `overflow-x: auto`.
2. The `<table>` has `min-width: 640px` so its natural width (640 px) exceeds the viewport (375 px).
3. The scroll wrapper clips the overflow and presents a horizontal scrollbar (or touch-drag surface on mobile).
4. User drags/scrolls horizontally within the wrapper; all columns become accessible.
5. No content is clipped outside the wrapper; the page itself does not scroll horizontally.

**Alternative Flows:**
- A1 (few columns): If the table has only 2 columns (min-width 640 px constraint still applies), the table is still ≥ 640 px wide; horizontal scroll is available even if not strictly needed.

**Exception Flows:**
- E1 (empty state): Grade data is absent; the empty-state component renders inside the scroll wrapper; no table element is present — no horizontal overflow occurs.
- E2 (loading state): Skeleton renders inside the scroll wrapper; the same `overflow-x: auto` + `min-width` applies so skeleton layout is stable.

**Business Rules:**
- BR-001: The scroll wrapper (the element with `overflow-x: auto`) MUST have `padding: 0` (TR-006) so the sticky first column starts flush with the left edge.
- BR-002: The scroll wrapper MUST have `role="region"` and `aria-label` from an existing i18n key (TR-NFR-001).

---

### UC-02: First column (student/subject name) is sticky during horizontal scroll

**Goal:** While the user scrolls right to see grade columns, the leftmost column (student or subject name) remains anchored at the left edge of the scroll wrapper so context is not lost.
**Primary Actor:** Student / Parent / Teacher / Principal
**Preconditions:**
- Grade table is rendered with at least 2 columns.
- Scroll wrapper has `overflow-x: auto`.

**Main Success Scenario:**
1. Table renders with `position: sticky; left: 0` on every cell of the first column (header `<th>` and all data `<td>`).
2. The sticky cell background is `var(--edu-card)` to cover scrolling cells behind it.
3. A right border `1px solid var(--edu-border)` separates the sticky column from the scrolling body.
4. `z-index: 1` ensures sticky cells render above adjacent scrolling cells.
5. User scrolls right; the first column stays at `left: 0` within the scroll container; scrolling cells slide behind it.

**Alternative Flows:**
- A1 (no sticky support — legacy browser): Browser does not support `position: sticky`; the first column scrolls normally. No error; graceful degradation is acceptable.

**Exception Flows:**
- E1 (z-index conflict): If a modal or popover opens over the table, its z-index must be > 1. Sticky cells at z-index 1 MUST NOT overlap modal layers.

**Business Rules:**
- BR-003: `z-index` on sticky cells MUST be exactly 1 — not higher (TR-004).
- BR-004: Background on sticky cells MUST be `var(--edu-card)`, not `background: white` or any raw color.
- BR-005: Right border MUST use `var(--edu-border)`, not a raw hex.

---

### UC-03: iOS momentum scroll (webkit-overflow-scrolling)

**Goal:** On iOS Safari, horizontal scroll within the grade table decelerates naturally (momentum scroll) matching native scroll behavior.
**Primary Actor:** Student / Parent (iOS device)
**Preconditions:**
- Device is iOS Safari.
- Table has `overflow-x: auto` wrapper.

**Main Success Scenario:**
1. The scroll wrapper has `-webkit-overflow-scrolling: touch` applied.
2. User initiates a horizontal swipe gesture.
3. After lifting their finger, the scroll continues and decelerates naturally (momentum) rather than stopping abruptly.

**Alternative Flows:**
- A1 (non-iOS): On Android Chrome or desktop, `-webkit-overflow-scrolling: touch` is ignored; standard scroll behavior applies. No adverse effect.

**Exception Flows:** None.

**Business Rules:**
- BR-006: `-webkit-overflow-scrolling: touch` MUST be applied as an inline style or Tailwind arbitrary value on the same element that carries `overflow-x: auto`.

---

### UC-04: Table has minimum width 640 px preventing column crush

**Goal:** No matter how narrow the viewport, the grade table never compresses its columns below their readable minimum; the scroll wrapper absorbs any overflow.
**Primary Actor:** Student / Parent / Teacher / Principal
**Preconditions:**
- Grade table is rendered.

**Main Success Scenario:**
1. `<table>` (or the root table grid element) has `min-width: 640px`.
2. At any viewport width (320 px through 1920 px), the table's computed width is ≥ 640 px.
3. At narrow viewports (≤ 639 px), the scroll wrapper clips the overflow; the page does not overflow.

**Alternative Flows:** None.

**Exception Flows:**
- E1 (320 px): At 320 px viewport, the table is still 640 px wide; horizontal scroll range is 320 px; `document.documentElement.scrollWidth === document.documentElement.clientWidth` (page itself does not scroll horizontally — only the wrapper does).

**Business Rules:**
- BR-007: `min-width` MUST be applied to the table element itself, not the wrapper; the wrapper must not have a fixed width.

---

### UC-05: Loading state (GradeBookSkeleton) layout unchanged

**Goal:** During data loading the skeleton layout occupies the same scroll wrapper and preserves the same column structure so there is no layout shift when real data arrives.
**Primary Actor:** Browser (system)
**Preconditions:**
- User navigates to the grade book screen.
- Data fetch is in-flight.

**Main Success Scenario:**
1. Loading state renders the `GradeBookSkeleton` component inside the same scroll wrapper that holds the real table.
2. Skeleton preserves the wrapper's `overflow-x: auto`, `min-width: 640px`, and `role="region"` / `aria-label`.
3. When data resolves, the skeleton is replaced by the real table; scroll position, container dimensions, and column visibility are unchanged.

**Alternative Flows:** None.

**Exception Flows:**
- E1 (fetch error after loading): After the skeleton phase, the data fetch returns an error; the skeleton is replaced by an error state; the scroll wrapper may or may not remain, but no horizontal overflow occurs.

---

### UC-06: Empty state (no grades) renders canonical empty state

**Goal:** When the grade table has no data rows, the canonical empty-state component renders inside the scroll wrapper and is correctly announced to screen readers.
**Primary Actor:** Teacher (viewing a new class with no grades entered)
**Preconditions:**
- Grade book screen is rendered.
- No grade data exists for the current class/period selection.

**Main Success Scenario:**
1. The data fetch returns an empty data set.
2. The table element is not rendered; instead the empty-state component (icon + title + body per `emptyStatePattern`) renders inside the scroll wrapper.
3. The empty-state container has `role="status"` so screen readers announce it.
4. The i18n key `grades.gradeBook.emptyState` is used for the title text (existing key — no new key added).
5. The scroll wrapper has no horizontal overflow (nothing to scroll).

**Alternative Flows:**
- A1 (role filter produces no results): Teacher applies a filter that results in zero visible rows; the empty state is shown; same behavior as above.

**Exception Flows:** None.

**Business Rules:**
- BR-008: Empty state MUST use `role="status"` on the container (per `emptyStatePattern.a11y`).
- BR-009: Empty state icon MUST be `aria-hidden="true"`.
- BR-010: The existing i18n key `grades.gradeBook.emptyState` MUST be reused; no new key is added.

---

### UC-07: All roles see correct mobile layout

**Goal:** Teacher, Principal, Student, and Parent all share the same `grade-book-table` component; the mobile scroll behavior applies identically regardless of role.
**Primary Actor:** Teacher / Principal / Student / Parent
**Preconditions:**
- User is authenticated with any of the four primary roles.
- User navigates to their respective grade-book route.
- Viewport is ≤ 375 px.

**Main Success Scenario:**
1. The role-specific page fetches grade data and passes it to `grade-book-table`.
2. The shared component applies the same `overflow-x: auto`, sticky first column, and `min-width: 640px` regardless of which role's page embedded it.
3. Student/Parent see their own grades (read-only rows); Teacher/Principal see the full class grade sheet.
4. Horizontal scroll behavior, sticky column, and momentum scroll are identical for all roles.

**Alternative Flows:**
- A1 (Student/Parent see fewer columns): The student view may display fewer grade columns (only the student's own); `min-width: 640px` still applies; sticky first column is still the identifier (e.g. subject name).

**Exception Flows:**
- E1 (wrong-role access): A role without grade-book access (e.g. a role that is not Teacher/Principal/Student/Parent) is redirected before the component renders. This is an auth/routing concern outside this UC.

---

## 4. Acceptance Criteria

---

### UC-01: Horizontal scroll on mobile

**AC-01.1 — Success (375 px, data present)**
Given a Student is on the grade book screen at 375 px viewport with grade data loaded,
When the table renders,
Then the scroll wrapper element has CSS `overflow-x: auto`; the `<table>` has computed width ≥ 640 px; horizontal scroll is available within the wrapper; no page-level horizontal scroll exists (`document.documentElement.scrollWidth === document.documentElement.clientWidth`).

**AC-01.2 — Scroll wrapper has no padding**
Given the grade book table renders at any viewport,
When the scroll wrapper is inspected,
Then the wrapper element has `padding: 0` (no internal horizontal padding that would create a gap left of the sticky column).

**AC-01.3 — Scroll container accessibility**
Given the grade book table renders at any viewport,
When the scroll wrapper is inspected,
Then the wrapper element has `role="region"` and a non-empty `aria-label` sourced from an existing i18n key (e.g. `grades.gradeBook.*`); no new i18n key has been added to `vi.json` / `en.json`.

**AC-01.4 — Loading state (375 px)**
Given the grade book screen is loading at 375 px,
When the skeleton renders inside the scroll wrapper,
Then the wrapper maintains `overflow-x: auto` and the skeleton does not cause page-level horizontal overflow.

**AC-01.5 — Empty state (375 px)**
Given the grade book screen loads with zero grade rows at 375 px,
When the empty state renders inside the scroll wrapper,
Then no `<table>` element is present; the scroll wrapper has no scrollable overflow; the empty-state container has `role="status"`.

---

### UC-02: Sticky first column

**AC-02.1 — First column header cell is sticky**
Given the grade book table renders with data,
When the scroll wrapper is scrolled 100 px to the right,
Then the first-column header cell (`<th>`) has `position: sticky` and `left: 0`; it remains visible at the left edge of the scroll wrapper.

**AC-02.2 — First column data cells are sticky**
Given the grade book table renders with data,
When the scroll wrapper is scrolled right,
Then every first-column data cell (`<td>` in column 1) has `position: sticky`, `left: 0`, background `var(--edu-card)` (not a raw color), and `z-index: 1`.

**AC-02.3 — Right border on sticky column**
Given the grade book table renders with data,
When the first-column cells are inspected,
Then each cell has `border-right: 1px solid var(--edu-border)`; scrolling body cells slide behind the sticky column and the border creates a visible separator.

**AC-02.4 — z-index does not conflict with modals**
Given a modal or popover is opened over the grade book table,
When the overlay renders,
Then the overlay has `z-index` > 1 and the sticky column cells (z-index 1) are visually covered by the overlay; no sticky cell bleeds above the modal.

---

### UC-03: iOS momentum scroll

**AC-03.1 — -webkit-overflow-scrolling applied**
Given the grade book scroll wrapper is rendered,
When its inline styles or computed styles are inspected,
Then the element has `-webkit-overflow-scrolling: touch` applied on the same element as `overflow-x: auto`.

---

### UC-04: Minimum table width

**AC-04.1 — Table min-width at 375 px**
Given the grade book screen renders at 375 px,
When the `<table>` element is measured,
Then its computed width is ≥ 640 px.

**AC-04.2 — Table min-width at 320 px**
Given the grade book screen renders at 320 px,
When the `<table>` element is measured,
Then its computed width is ≥ 640 px; `document.documentElement.scrollWidth === document.documentElement.clientWidth` (page does not overflow; only the wrapper scrolls).

**AC-04.3 — Table does not exceed natural width at desktop**
Given the grade book screen renders at 1280 px,
When the `<table>` is measured,
Then its width expands to fill the container (> 640 px); `min-width` does not artificially constrain or shrink it.

---

### UC-05: Loading state layout

**AC-05.1 — Skeleton inside scroll wrapper**
Given the grade book screen is loading at 375 px,
When the `GradeBookSkeleton` renders,
Then it is a child of the same scroll wrapper (the element with `overflow-x: auto` and `role="region"`).

**AC-05.2 — No layout shift on data arrival**
Given the grade book screen transitions from loading to loaded,
When real table rows replace the skeleton,
Then the scroll wrapper dimensions are unchanged; no sudden resize of the wrapper; CLS contribution ≈ 0.

---

### UC-06: Empty state

**AC-06.1 — Empty state role and i18n**
Given the grade book has no data rows,
When the empty state renders,
Then the container has `role="status"`; the title text matches the `grades.gradeBook.emptyState` i18n key value in the current locale; the icon has `aria-hidden="true"`.

**AC-06.2 — No i18n key addition**
Given this story is implemented,
When `vi.json` and `en.json` are diffed against the pre-story baseline,
Then zero new keys have been added.

---

### UC-07: Role variants

**AC-07.1 — Student view on mobile**
Given a Student is on `/student/grades` at 375 px,
When the grade table renders with their grades,
Then `overflow-x: auto`, sticky first column, and `min-width: 640px` are present; the student's subject-name column is the sticky column.

**AC-07.2 — Parent view on mobile**
Given a Parent is on `/parent/grades` at 375 px,
When the grade table renders,
Then the same mobile scroll behavior applies as UC-07 AC-07.1.

**AC-07.3 — Teacher view on tablet**
Given a Teacher is on `/teacher/grades` at 768 px,
When the grade table renders,
Then the scroll wrapper is present; if the table width exceeds 768 px it is scrollable; sticky first column is visible.

**AC-07.4 — Row action touch target (if applicable)**
Given a table row contains a tappable action element (e.g. drill-down icon) and the viewport is < 640 px,
When the element renders,
Then its computed hit area is ≥ 44 × 44 px.

---

## 5. Edge Case Matrix

| Scenario | UC-01 (scroll) | UC-02 (sticky col) | UC-03 (momentum) | UC-04 (min-width) | UC-05 (loading) | UC-06 (empty) | UC-07 (roles) |
|---|---|---|---|---|---|---|---|
| Viewport = 375 px, data | overflow-x scroll | sticky visible | momentum active | width ≥ 640 | — | — | Student/Parent primary |
| Viewport = 320 px | Page no overflow | sticky visible | momentum active | width ≥ 640 | — | — | All roles |
| Viewport = 1280 px | Wrapper still present | sticky present but col not offset (natural scroll) | ignored | width > 640 natural | — | — | Teacher/Principal |
| 0 grade rows | No table, no scroll | N/A | N/A | N/A | — | Empty state shown | All roles |
| Data loading | Skeleton in wrapper | N/A | N/A | Skeleton layout | Skeleton in wrapper | — | All roles |
| Network error | Error state in wrapper | N/A | N/A | N/A | Error replaces skeleton | — | All roles |
| Auth expired | Redirect to login | — | — | — | — | — | — |
| Modal open over table | — | Sticky z-index 1, modal > 1 | — | — | — | — | — |
| Many columns (20+) | Scroll range widens | Sticky col always visible | iOS momentum | min-width still floor | — | — | Teacher |
| Zero columns (edge) | No scroll | N/A | N/A | min-width still applied | — | — | All roles |
| `position: sticky` unsupported | Scroll still works | First col scrolls (acceptable) | N/A | min-width still applied | — | — | Legacy browsers |
| Wrong role (no grade access) | Auth redirect before render | — | — | — | — | — | — |

---

## 6. Open Questions

**[OPEN QUESTION 1]** `TR-NFR-001` and `AC-01.3` require the scroll wrapper to have `aria-label` from an existing i18n key. The requirements note an assumption that a suitable key exists under `grades.gradeBook.*`. The FE team MUST confirm this key exists before implementation. If no suitable key is present, `ba-lead` must authorize a single targeted key addition (one `vi` source + one `en` mirror); this would invalidate `AC-06.2` ("zero new keys") and require a requirements delta.

**[OPEN QUESTION 2]** The requirements state the scope is `src/features/grades/presentation/grade-book-screen/` but the implementation-facts note identifies the actual shared component at `src/components/shared/grade-book-table/grade-book-table.tsx`. The FE team should confirm that the `grade-book-table` shared component is the single place to apply these changes, and that no role-specific wrapper applies a conflicting overflow style that would override the fix.

**[OPEN QUESTION 3]** The requirements exclude "Grade Entry screen" and "Grade Approval screen" from scope. However, if those screens also embed `grade-book-table`, they will inherit the mobile scroll changes automatically. The FE team should verify whether those screens use the same shared component and whether the inherited scroll behavior is desirable or requires scoping guards.
