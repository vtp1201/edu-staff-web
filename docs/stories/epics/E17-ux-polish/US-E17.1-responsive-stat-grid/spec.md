# Spec — US-E17.1 Responsive Stat-Card Grid

**Status:** Planned | **Lane:** normal
**Sources:** requirements.md · use-cases.md · `docs/product/design-spec.jsonc` (`responsiveGrid.statGrid`)

---

## 1. Overview

All stat-card grids across the discipline screen, teacher dashboard, student dashboard, principal dashboard, and attendance-summary-card currently use hard-coded multi-column Tailwind classes (`grid-cols-4`, `lg:grid-cols-4`, `grid-cols-2 sm:grid-cols-4`) that produce a cramped or overflowing layout on viewports below 640 px. This story replaces every affected grid container's column definition with the Tailwind arbitrary value `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` so the grid collapses naturally: 4 columns above 1024 px, 2 columns at 640–1024 px, 1 column below 640 px. The change is purely CSS — no JavaScript layout detection, no new tokens, no new i18n keys, no BE changes.

---

## 2. Screen & Route

| Route | Component file | Design spec key |
|---|---|---|
| `/discipline` | `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` (line 61) | `responsiveGrid.statGrid` |
| `/discipline` (Conduct tab) | `src/features/discipline/presentation/discipline-screen/conduct-tab.tsx` (line 109) | `responsiveGrid.statGrid` |
| `/discipline` (Violations tab) | `src/features/discipline/presentation/discipline-screen/violations-tab.tsx` (line 167) | `responsiveGrid.statGrid` |
| `/teacher` | `src/features/teacher/presentation/teacher-dashboard-home/teacher-dashboard-home.tsx` (line 55) | `responsiveGrid.statGrid` |
| `/principal` | `src/features/principal/presentation/principal-dashboard/principal-dashboard.tsx` (line 29) | `responsiveGrid.statGrid` |
| `/student` | `src/features/student/presentation/student-dashboard/student-dashboard.tsx` (line 25) | `responsiveGrid.statGrid` |
| Multiple (embedded) | `src/features/attendance/presentation/attendance-screen/attendance-summary-card.tsx` (line 17) | `responsiveGrid.statGrid` |

---

## 3. Actors & RBAC

| Role | Screen(s) affected | Primary device | Grid visible |
|---|---|---|---|
| Teacher | discipline-screen (all tabs), teacher-dashboard-home | Desktop + tablet | Yes |
| Principal | discipline-screen, principal-dashboard | Desktop + tablet | Yes |
| Student | student-dashboard | Mobile-first | Yes |
| Parent | discipline-screen (parent view) | Mobile-first | Yes |
| All roles | attendance-summary-card (embedded in multiple screens) | All | Yes |

No role-gated visibility — all authenticated roles see stat cards relevant to their role. The grid fix applies regardless of role.

---

## 4. Functional Spec

### FR-1 — Replace hard-coded grid column classes (TR-001, TR-002)

The system SHALL replace every hard-coded stat-card grid column class with `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` on all affected grid containers.

**Exact changes per file:**

| File | Line | Before | After |
|---|---|---|---|
| `discipline-screen.tsx` | 61 | `grid-cols-2 gap-3.5 lg:grid-cols-4` | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` |
| `conduct-tab.tsx` | 109 | `grid-cols-2 gap-3.5 lg:grid-cols-4` (or equivalent) | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` |
| `violations-tab.tsx` | 167 | `grid-cols-2 gap-3.5 lg:grid-cols-4` (or equivalent) | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` |
| `teacher-dashboard-home.tsx` | 55 | `grid-cols-[repeat(auto-fit,minmax(180px,1fr))]` | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` (update floor from 180 px to 200 px) |
| `principal-dashboard.tsx` | 29 | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` |
| `student-dashboard.tsx` | 25 | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` (or equivalent) | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` |
| `attendance-summary-card.tsx` | 17 | `grid-cols-2 sm:grid-cols-4` | `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` |

The arbitrary value `grid-cols-[repeat(auto-fit,minmax(200px,1fr))]` is supported in this codebase — confirmed by existing usage in `src/features/admin/subject-catalogue/`.

**Expected column counts:**

| Viewport | Available width (with 32 px side padding) | Columns |
|---|---|---|
| > 1024 px | > 992 px | 4 |
| 640–1024 px | 608–992 px | 2 |
| < 640 px (including 375 px) | < 608 px | 1 |
| 320 px (minimum) | 288 px | 1 (card ≈ 288 px, above 200 px floor) |

### FR-2 — Preserve gap (TR-003)

The system SHALL retain the existing `gap-4` (16 px) class on each grid container unchanged. The arbitrary column class does not affect the gap; the gap class is preserved as-is.

### FR-3 — Enforce 200 px card minimum (TR-004)

The `minmax(200px, 1fr)` floor guarantees no stat card is narrower than 200 px. At 320 px viewport (288 px available), a single column card is 288 px — above the floor. The FE team MUST NOT raise this floor value.

### FR-4 — Touch target on interactive stat-card elements (TR-005)

If any stat card on a mobile-viewed screen contains a clickable/tappable element (drill-down link, info tooltip trigger), the system SHALL ensure its touch target is ≥ 44 × 44 px. The FE team MUST audit each affected screen for interactive elements within stat cards and apply `min-h-[44px] min-w-[44px]` (or equivalent padding) where needed. If no interactive elements exist, this FR is N/A for that screen.

### FR-5 — No JavaScript breakpoint detection (TR-NFR-003)

The system SHALL NOT add `window.innerWidth` checks, `matchMedia` calls, or `ResizeObserver` registrations for column switching. The CSS engine resolves column count automatically.

---

## 5. Non-Functional Requirements

| NFR | Target | Verification |
|---|---|---|
| **A11y — WCAG 2.1 AA (TR-NFR-001)** | DOM order of stat-card elements MUST NOT change at any breakpoint; tab order matches visual reading order at 320 px, 768 px, and 1280 px; no accessibility tree regression. `auto-fit` does not reorder DOM — constraint is automatically satisfied. | Storybook a11y addon + manual keyboard tab audit at 375 px and 1280 px. |
| **Responsive — no break at 320 px (TR-NFR-002)** | `document.documentElement.scrollWidth === document.documentElement.clientWidth` at 320 px; no horizontal scrollbar. | Chromium device-mode at 320 px; Playwright viewport assertion. |
| **Performance — CSS only (TR-NFR-003)** | Zero `window.innerWidth` / `matchMedia` / `ResizeObserver` calls added by this story. | Code review; grep for matchMedia in diff. |
| **i18n (TR-NFR-004)** | Zero new keys in `vi.json` / `en.json`. | `git diff src/bootstrap/i18n/messages/` shows no additions. |
| **Responsive — 375 px** | 1 column, no overflow. | Storybook viewport story at 375 px; Playwright. |
| **Responsive — 768 px** | 2 columns, no overflow. | Storybook viewport story at 768 px. |
| **Responsive — 1280 px** | 4 columns, no overflow. | Storybook viewport story at 1280 px. |

---

## 6. Acceptance Criteria

**AC-01** — Desktop 4-column (> 1024 px)
Given any role views a screen with a stat-card grid at 1280 px viewport with data loaded,
When the page renders,
Then the grid shows 4 columns; each card is ≥ 200 px wide; no horizontal overflow; `grid-template-columns` resolves to `repeat(auto-fit, minmax(200px, 1fr))`.

**AC-02** — No JS column detection
Given any stat-card grid at desktop,
When the page loads,
Then no `window.innerWidth`, `matchMedia`, or `ResizeObserver` calls are introduced by this story's diff.

**AC-03** — Desktop loading state (4 columns)
Given any dashboard is loading at 1280 px,
When skeleton stat cards render in the grid container,
Then 4 skeleton columns display; no layout shift occurs when real data arrives (CLS ≈ 0).

**AC-04** — Tablet 2-column (768 px)
Given any role views a screen with a stat-card grid at 768 px with data loaded,
When the page renders,
Then the grid shows 2 columns; each card is ≥ 200 px wide; no horizontal overflow.

**AC-05** — `attendance-summary-card` 2 columns at 768 px
Given any role views a screen embedding `attendance-summary-card` at 768 px,
When the summary renders,
Then the inner stat grid shows 2 columns (not the previous `sm:grid-cols-4`).

**AC-06** — Live resize 4 to 2 columns
Given a user resizes from 1280 px down to 900 px,
When the viewport crosses 1024 px,
Then the grid reflows from 4 to 2 columns without a page reload and without horizontal overflow at any point.

**AC-07** — Tablet loading state (2 columns)
Given any dashboard is loading at 768 px,
When skeleton stat cards render,
Then 2 skeleton columns display; no layout shift on data arrival.

**AC-08** — Mobile 1-column at 375 px
Given a Student views the student-dashboard at 375 px with data loaded,
When the page renders,
Then the grid shows 1 column; each card width ≈ 343 px (375 − 32 padding); no horizontal scrollbar.

**AC-09** — Mobile 1-column at 320 px (minimum)
Given any user views a stat-grid screen at 320 px,
When the page renders,
Then the grid shows 1 column; card width ≈ 288 px (above 200 px floor); `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

**AC-10** — Conduct tab at 375 px
Given a Teacher views the discipline-screen Conduct tab at 375 px,
When the tab renders,
Then the stat-card grid shows 1 column; no horizontal overflow.

**AC-11** — Violations tab at 375 px
Given a Teacher views the discipline-screen Violations tab at 375 px,
When the tab renders,
Then the stat-card grid shows 1 column; no horizontal overflow.

**AC-12** — Mobile loading state (1 column)
Given any dashboard is loading at 375 px,
When skeleton stat cards render,
Then 1 skeleton column displays; no overflow.

**AC-13** — DOM order unchanged across breakpoints
Given any stat-grid screen is viewed at 320 px, 768 px, and 1280 px,
When the CSS engine reflows the grid,
Then the DOM order of stat-card elements is identical at all three widths; tab order matches reading order at all widths.

**AC-14** — Gap preserved at all breakpoints
Given the grid renders at 375 px, 768 px, or 1280 px,
When cards display,
Then the gap between adjacent cards is 16 px (`gap-4`); the gap class is unchanged from the pre-fix baseline.

**AC-15** — Error state after loading
Given the data fetch returns a network error after loading begins,
When the error state renders,
Then the grid container is replaced by an error-state component; no empty grid with skeleton ghosts remains.

**AC-16** — Touch target on interactive elements (conditional)
Given a stat card on mobile (375 px) contains a tappable element,
When it renders,
Then its computed hit area is ≥ 44 × 44 px. (N/A if the card has no interactive element — FE team audits per screen.)

---

## 7. Dependencies

- **Depends on:** none
- **Blocks:** none
- **Feature modules touched:**
  - `src/features/discipline/presentation/discipline-screen/`
  - `src/features/teacher/presentation/teacher-dashboard-home/`
  - `src/features/principal/presentation/principal-dashboard/`
  - `src/features/student/presentation/student-dashboard/`
  - `src/features/attendance/presentation/attendance-screen/`
- **Shared contracts:** none (no shared component touched; changes are per-feature presentation files)

---

## 8. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
|---|---|---|---|---|
| TR-001 — CSS pattern replacement | requirements.md | UC-01, UC-02, UC-03 | None (CSS only) | Must |
| TR-002 — Column counts at breakpoints | requirements.md | UC-01, UC-02, UC-03 | None | Must |
| TR-003 — Gap preservation | requirements.md | UC-05 (AC-14) | None | Must |
| TR-004 — 200 px card minimum | requirements.md | UC-03 (320 px) | None | Must |
| TR-005 — Touch target | requirements.md | UC-06 | None | Should |
| TR-NFR-001 — WCAG 2.1 AA / DOM order | requirements.md | UC-03 (AC-13) | None | Must |
| TR-NFR-002 — No break at 320 px | requirements.md | UC-05 (AC-09) | None | Must |
| TR-NFR-003 — CSS only, no JS | requirements.md | UC-01 (AC-02) | None | Should |
| TR-NFR-004 — No new i18n keys | requirements.md | — | None | Must |

---

## 9. Open Questions

**[OQ-001]** The use-cases.md flags that "teacher dashboard" in DR-010 may be an error — the confirmed file is `teacher-dashboard-home.tsx`. The implementation facts note confirms the file exists at `src/features/teacher/presentation/teacher-dashboard-home/teacher-dashboard-home.tsx` line 55. This is now RESOLVED by the implementation facts provided with this packet. No blocker.

**[OQ-002]** TR-005 / AC-16 activates only if stat cards contain interactive elements. The FE team MUST audit each affected screen for interactive children within stat cards and apply touch-target sizing where needed. If no interactive elements exist on any screen, AC-16 is globally N/A.

**[OQ-003]** The FE team should grep `src/features/` for any remaining `grid-cols-4`, `lg:grid-cols-4`, or `repeat(4, 1fr)` patterns that may exist outside the seven files listed above, to ensure no stat-card grid is missed.
