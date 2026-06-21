# Use Cases — US-E17.1 Responsive Stat-Card Grid

---

## 1. Use Case Scope Summary

**Total UCs:** 6
**Actors:** Teacher, Principal, Student, Parent (read-only viewers of their own stat-card dashboards)
**Boundary:** Pure CSS layout change to existing presentation components across discipline-screen, student-dashboard, principal-dashboard, and attendance-summary-card. No BE calls, no new routes, no new i18n keys, no new design tokens. No interactive logic is changed.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities |
|---|---|---|
| Teacher | Human | Views discipline-screen stat-card grid on desktop/tablet |
| Principal | Human | Views principal-dashboard stat-card grid on desktop/tablet |
| Student | Human | Views student-dashboard stat-card grid; primary mobile user |
| Parent | Human | Views parent/discipline stat-card grid; primary mobile user |
| Browser (CSS engine) | System | Evaluates `repeat(auto-fit, minmax(200px, 1fr))` and produces column count at the current viewport width |

---

## 3. Use Case Catalogue

---

### UC-01: Stat grid renders 4 columns at desktop (>1024 px)

**Goal:** At a viewport wider than 1024 px the grid occupies all four columns so stat cards are compact and side-by-side as designed.
**Primary Actor:** Teacher / Principal / Student / Parent
**Preconditions:**
- User is authenticated with the appropriate role.
- The dashboard or discipline-screen is rendered with stat-card data present (non-empty success state).
- Viewport width > 1024 px.

**Main Success Scenario:**
1. User navigates to a screen that contains a stat-card grid.
2. Browser evaluates the grid container's `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`.
3. At viewport > 1024 px, sufficient width exists for four minmax(200px) columns.
4. Grid renders exactly 4 columns; all stat cards are visible without horizontal overflow or clipping.

**Alternative Flows:**
- A1 (fewer than 4 cards): If the screen supplies fewer than 4 stat cards (e.g. a variant showing 3 cards), the grid still lays them out with `auto-fit`; they expand to fill the row. No orphaned column gaps.

**Exception Flows:**
- E1 (loading state): Stat-card data is still loading; skeleton cards are rendered in the same grid container with the same CSS class — 4 skeleton columns display at desktop.

**Business Rules:**
- BR-001: `gridTemplateColumns` MUST be `repeat(auto-fit, minmax(200px, 1fr))` — not a hard-coded `repeat(4, 1fr)`.
- BR-002: No `@media` query or JS `matchMedia` is used for column switching.

**Non-Functional Constraints:**
- No JS layout detection (TR-NFR-003).
- DOM order is unchanged by `auto-fit` (TR-NFR-001, WCAG 1.3.2).

---

### UC-02: Stat grid collapses to 2 columns at tablet (640–1024 px)

**Goal:** At viewport widths between 640 px and 1024 px the grid naturally reflows to 2 columns, preventing over-cramped cards.
**Primary Actor:** Teacher / Principal / Student / Parent
**Preconditions:**
- User is on a screen with a stat-card grid.
- Viewport width is in the range 640 px to 1024 px (inclusive of 768 px tablet).
- Data is present (success state).

**Main Success Scenario:**
1. User resizes their browser or loads the page on a tablet-width viewport (e.g. 768 px).
2. Browser evaluates `repeat(auto-fit, minmax(200px, 1fr))`.
3. At 768 px (minus 32 px side padding = 736 px available) two 200 px-minimum columns fit; a third would require 600 px+ per column — `auto-fit` wraps to 2.
4. Grid renders 2 columns; each card is at least 200 px wide. No horizontal overflow.

**Alternative Flows:**
- A1 (live resize): User drags browser from 1024 px down to 639 px — grid transitions from 4 → 2 → 1 column without a page reload, purely via CSS reflow.

**Exception Flows:**
- E1 (loading state): Skeleton cards show in 2-column layout at tablet.

**Business Rules:**
- BR-001 applies (same CSS class, same mechanism).

---

### UC-03: Stat grid collapses to 1 column at mobile (<640 px, including 375 px and 320 px)

**Goal:** At mobile viewport widths the grid renders single-column so each stat card occupies the full available width and is readable without horizontal scroll.
**Primary Actor:** Student / Parent (primary mobile users); Teacher / Principal (secondary)
**Preconditions:**
- User is on a screen with a stat-card grid.
- Viewport width < 640 px.
- Data is present (success state) OR loading state (skeletons).

**Main Success Scenario:**
1. User loads the page on a mobile device (375 px) or a very small viewport (320 px).
2. Browser evaluates `repeat(auto-fit, minmax(200px, 1fr))` on a container width of 343 px (375 px − 32 px padding) or 288 px (320 px − 32 px padding).
3. Both available widths are below 2 × 200 px = 400 px, so `auto-fit` places all cards in a single column.
4. Each stat card renders at the full container width (343 px or 288 px), both above the 200 px floor.
5. No horizontal scroll appears. No card content is clipped.

**Alternative Flows:**
- A1 (discipline-screen has 3 tabs): The stat-card grid in the Conduct tab and Violations tab each reflow independently to 1 column at mobile; they do not share a grid container.

**Exception Flows:**
- E1 (loading state): Skeleton cards show in 1-column layout at mobile.
- E2 (320 px minimum): At 320 px the grid must still produce a single column with no page-level horizontal scroll (TR-NFR-002).

**Business Rules:**
- BR-003: The `minmax` floor of 200 px MUST NOT be raised — at 320 px the 288 px available width would produce zero columns if the floor exceeded 288 px.

---

### UC-04: Grid layout during loading state

**Goal:** While stat-card data is pending, skeleton placeholder cards occupy the same responsive grid so no layout shift occurs when real data arrives.
**Primary Actor:** Browser (system)
**Preconditions:**
- User navigates to a screen with a stat-card grid.
- Data fetch is in-flight (loading state).

**Main Success Scenario:**
1. Network request for stat data is initiated.
2. Presentation component renders N skeleton card placeholders inside the same grid container that will hold real cards.
3. The grid container already has `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`.
4. Skeletons render at the same breakpoint-responsive column count as real cards.
5. When data resolves, real cards replace skeletons with no column-count change and no layout shift (CLS ≈ 0).

**Alternative Flows:** None (loading is always pre-data).

**Exception Flows:**
- E1 (network error replaces loading): After loading, a fetch error occurs. The grid is replaced by an error state; the grid container is no longer rendered. This is outside this UC's scope — see UC-04's error AC for observable state.

---

### UC-05: No horizontal overflow at any breakpoint

**Goal:** At every viewport width (320 px through 1920 px), the stat-card grid and its parent page produce no horizontal overflow / horizontal scrollbar.
**Primary Actor:** Student / Parent (mobile); Teacher / Principal (desktop)
**Preconditions:**
- User is on any screen with a stat-card grid.
- Page-level horizontal padding of 16 px per side is applied (per design-spec).

**Main Success Scenario:**
1. User views the page at any viewport width ≥ 320 px.
2. `repeat(auto-fit, minmax(200px, 1fr))` produces 1–4 columns as appropriate; no column exceeds the container width.
3. No card overflows its grid cell.
4. `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no page-level horizontal scroll).

**Alternative Flows:** None.

**Exception Flows:**
- E1 (card content overflow): If a stat card contains long text, the card's internal text wraps rather than extending the card outside its column boundary. This is a card-level concern; the grid itself does not overflow.

---

### UC-06: Touch target ≥ 44 px on interactive stat-card elements (if applicable)

**Goal:** On mobile viewports, any tappable element within a stat card (drill-down link, info trigger) presents a touch area of at least 44 × 44 px.
**Primary Actor:** Student / Parent (mobile)
**Preconditions:**
- Viewport width < 640 px.
- At least one stat card on the screen contains a clickable/tappable element.

**Main Success Scenario:**
1. User views a stat card on mobile (375 px).
2. The interactive element (e.g. a drill-down arrow or tooltip icon) has a computed height ≥ 44 px and width ≥ 44 px, or an equivalent padding/margin that expands the hit area to ≥ 44 × 44 px.
3. User can tap the element without accidentally activating adjacent elements.

**Alternative Flows:**
- A1 (no interactive element): Most stat cards on the affected screens are display-only; this UC is N/A if no interactive element is present. The FE team MUST confirm presence/absence per screen.

**Exception Flows:** None.

**Business Rules:**
- BR-004: Touch target enforcement follows WCAG 2.5.5 AA (≥ 44 × 44 px).

---

## 4. Acceptance Criteria

---

### UC-01: Desktop 4-column layout (viewport > 1024 px)

**AC-01.1 — Success (1280 px viewport, data present)**
Given a Teacher is viewing the discipline-screen stat-card grid at a 1280 px viewport width,
When the page renders with 4 stat cards in a loaded state,
Then the grid container has computed style `grid-template-columns` matching four equal columns (each ≥ 200 px), and all 4 cards are visible without horizontal overflow.

**AC-01.2 — Success (1280 px, principal-dashboard)**
Given a Principal is viewing the principal-dashboard at 1280 px,
When the stat-card section renders,
Then the stat grid shows 4 columns and no card is clipped or hidden.

**AC-01.3 — Success (1280 px, student-dashboard)**
Given a Student is viewing the student-dashboard at 1280 px,
When the stat-card section renders,
Then the stat grid shows 4 columns and no card is clipped or hidden.

**AC-01.4 — CSS mechanism (no JS)**
Given any stat-card grid at desktop width,
When the page loads,
Then there are no `window.innerWidth` checks, `matchMedia` calls, or `ResizeObserver` registrations introduced by this story's changes; column count is determined entirely by the CSS engine.

**AC-01.5 — Loading state at desktop**
Given the discipline-screen is loading stat data at 1280 px,
When the grid renders skeleton cards,
Then the skeleton cards occupy 4 columns matching the layout of the real-data state; no layout shift occurs when real data replaces skeletons.

---

### UC-02: Tablet 2-column layout (640–1024 px)

**AC-02.1 — Success (768 px viewport)**
Given a Teacher is viewing the discipline-screen at 768 px viewport width,
When the page renders with stat data loaded,
Then the stat-card grid renders exactly 2 columns; each card width is ≥ 200 px; no horizontal overflow is present.

**AC-02.2 — Success (768 px, attendance-summary-card)**
Given any role views a screen containing `attendance-summary-card` at 768 px,
When the summary card renders,
Then the inner stat grid shows 2 columns (not the previous `grid-cols-2 sm:grid-cols-4` which failed to go to 1-col below 640 px).

**AC-02.3 — Live resize 4 to 2 columns**
Given a user resizes from 1280 px down to 900 px,
When the viewport crosses 1024 px,
Then the grid reflows from 4 columns to 2 columns without a page reload and without horizontal overflow at any point during the resize.

**AC-02.4 — Loading state at tablet**
Given the student-dashboard is loading at 768 px,
When skeleton cards render,
Then they appear in 2 columns; no layout shift on data arrival.

---

### UC-03: Mobile 1-column layout (< 640 px)

**AC-03.1 — Success (375 px)**
Given a Student views the student-dashboard at 375 px viewport width,
When the page renders with stat data loaded,
Then the stat-card grid renders exactly 1 column; each card width equals the container width (≈ 343 px); no horizontal scrollbar is present.

**AC-03.2 — Success (320 px minimum)**
Given a Parent views the discipline-screen at 320 px viewport width,
When the page renders,
Then the stat-card grid renders 1 column; the card width is ≥ 200 px (computed ≈ 288 px); `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no page-level horizontal scroll).

**AC-03.3 — Conduct tab at mobile**
Given a Teacher views the discipline-screen Conduct tab at 375 px,
When the tab renders its stat-card grid,
Then the grid shows 1 column; no horizontal overflow.

**AC-03.4 — Violations tab at mobile**
Given a Teacher views the discipline-screen Violations tab at 375 px,
When the tab renders its stat-card grid,
Then the grid shows 1 column; no horizontal overflow.

**AC-03.5 — Loading state at mobile**
Given any dashboard is loading at 375 px,
When skeleton stat cards render,
Then they appear in 1 column; no overflow.

**AC-03.6 — DOM order preserved**
Given a screen with a stat-card grid is viewed at any breakpoint,
When the CSS engine reflows the grid,
Then the DOM order of stat-card elements is identical at 320 px, 768 px, and 1280 px (no DOM reordering by `auto-fit`); tab order matches the rendered reading order at all three widths.

---

### UC-04: Loading state layout

**AC-04.1 — Skeleton column count matches data column count**
Given a user navigates to any stat-grid screen (discipline / student-dashboard / principal-dashboard) on mobile (375 px),
When the data fetch is in-flight,
Then the grid renders skeleton placeholder cards in 1 column — matching the column count expected for 375 px in the loaded state.

**AC-04.2 — No layout shift on data arrival**
Given the grid is in loading state with N skeleton cards,
When the data resolves and real stat cards replace the skeletons,
Then the grid column count and card dimensions are unchanged; Cumulative Layout Shift contribution is ≈ 0.

**AC-04.3 — Error state after loading**
Given the grid is loading and the data fetch returns a network error,
When the error state is displayed,
Then the grid container is replaced by an error-state component (no empty grid with skeleton ghosts remains).

---

### UC-05: No horizontal overflow at any breakpoint

**AC-05.1 — No page scroll at 375 px**
Given a Student views the student-dashboard at 375 px,
When the page renders in success state,
Then `document.documentElement.scrollWidth === document.documentElement.clientWidth`; no horizontal scrollbar is visible or scroll-accessible.

**AC-05.2 — No page scroll at 320 px**
Given any user views a stat-grid screen at 320 px,
When the page renders,
Then `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

**AC-05.3 — Gap between cards preserved**
Given the grid renders at any breakpoint (375 px, 768 px, 1280 px),
When the cards display,
Then the gap between adjacent cards is 16 px (matching the existing design-system spacing token `gap-4`); the gap value has not changed from the pre-fix implementation.

---

### UC-06: Touch target on interactive stat-card elements

**AC-06.1 — Drill-down / interactive element touch target**
Given a stat card on mobile (375 px) contains a tappable element (drill-down link or info trigger),
When the element renders,
Then its computed height ≥ 44 px and width ≥ 44 px, or the element has padding such that its hit area covers a 44 × 44 px region.

**AC-06.2 — No interactive element (N/A guard)**
Given a stat card is display-only (no interactive child element),
When it renders at any viewport,
Then this AC is not applicable; the card renders without interactive affordance and does not require touch-target enforcement.

---

## 5. Edge Case Matrix

| Scenario | UC-01 (desktop) | UC-02 (tablet) | UC-03 (mobile 375/320) | UC-04 (loading) | UC-05 (overflow) | UC-06 (touch target) |
|---|---|---|---|---|---|---|
| Viewport = 1024 px (boundary) | 4 cols still (> 1024 spec) | — | — | 4 col skeletons | No overflow | N/A |
| Viewport = 640 px (boundary) | — | 2 cols (>=640) | — | 2 col skeletons | No overflow | N/A |
| Viewport = 639 px (mobile) | — | — | 1 col | 1 col skeletons | No overflow | Touch target required |
| 320 px minimum | — | — | 1 col, card ≥200px | 1 col skeletons | No page scroll | Touch target required |
| Fewer than 4 stat cards | Fills row with auto-fit | Fills 1–2 cols | 1 col | Matches card count | No overflow | N/A |
| Empty data (0 cards) | Grid not rendered | Grid not rendered | Grid not rendered | — | No overflow | N/A |
| Network error replaces loading | Error state shown | Error state shown | Error state shown | Skeletons removed | No overflow | N/A |
| Auth expired during view | Auth redirect | Auth redirect | Auth redirect | Auth redirect | N/A | N/A |
| Long text in stat value | Card wraps internally | Card wraps internally | Card wraps internally | N/A | No overflow | N/A |
| CSS `auto-fit` not supported (IE) | Fallback 4-col | Fallback 4-col | Overflow possible (acceptable) | — | Acceptable degradation | N/A |
| Teacher dashboard missing from src/features/teacher/ | [OPEN QUESTION — see §6] | [OPEN QUESTION] | [OPEN QUESTION] | [OPEN QUESTION] | [OPEN QUESTION] | N/A |

---

## 6. Open Questions

**[OPEN QUESTION 1]** The requirements reference a "teacher dashboard" in `src/features/teacher/presentation/` but no such file exists in the repo (confirmed by the implementation-facts note in this packet). The affected grids listed in the implementation facts are `discipline-screen`, `principal-dashboard`, `student-dashboard`, and `attendance-summary-card`. Before implementation, the FE team MUST grep `src/features/` for any remaining `repeat(4, 1fr)` or `grid-cols-4` / `lg:grid-cols-4` patterns to identify any additional stat-grid instances not enumerated in this story. `ba-lead` should confirm whether "teacher dashboard" is an error in DR-010 or refers to a component not yet implemented.

**[OPEN QUESTION 2]** TR-005 / UC-06 notes that touch-target enforcement applies "if any stat card contains a clickable/tappable element." The current implementation of the four affected screens has not been audited for interactive elements within stat cards. The FE team MUST confirm presence or absence of interactive elements per screen; AC-06.1 activates only where interactive elements exist.

**[OPEN QUESTION 3]** The `attendance-summary-card` in `src/features/attendance/presentation/attendance-screen/attendance-summary-card.tsx` currently has `grid-cols-2 sm:grid-cols-4` (Tailwind breakpoint classes, not `auto-fit`). The fix MUST use `repeat(auto-fit, minmax(200px, 1fr))` (CSS Grid direct style or a Tailwind arbitrary value), NOT merely change to Tailwind breakpoint classes like `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. If the project Tailwind config does not support an arbitrary `[repeat(auto-fit,minmax(200px,1fr))]` value, the FE team should align with `ba-lead` on whether a Tailwind arbitrary value or an inline style is the canonical approach for this repo.
