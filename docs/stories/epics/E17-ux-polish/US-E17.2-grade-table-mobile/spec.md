# Spec — US-E17.2 Grade Table Mobile Scroll

**Status:** Planned | **Lane:** normal
**Sources:** requirements.md · use-cases.md · `docs/product/design-spec.jsonc` (`responsiveGrid.gradeTable`)

---

## 1. Overview

The shared `grade-book-table` component (`src/components/shared/grade-book-table/grade-book-table.tsx`) already has a scroll wrapper with `overflow-x-auto` and sticky first-column cells (confirmed at lines 86, 95, 170). However three items are missing that make mobile horizontal scroll fully functional and accessible: `-webkit-overflow-scrolling: touch` for iOS momentum scroll, `min-w-[640px]` on the `<table>` element to prevent column crushing, and `border-r border-border` on sticky first-column cells to visually separate them from scrolling content. This story adds exactly those three items. No new tokens, no new i18n keys, and no BE changes are required. The grade book empty state is out of scope (covered in US-E17.5).

---

## 2. Screen & Route

| Route | Component file | Design spec key |
|---|---|---|
| `/teacher/grades` | `src/components/shared/grade-book-table/grade-book-table.tsx` | `responsiveGrid.gradeTable` |
| `/principal/grades` | Same shared component | `responsiveGrid.gradeTable` |
| `/student/grades` | Same shared component | `responsiveGrid.gradeTable` |
| `/parent/grades` | Same shared component | `responsiveGrid.gradeTable` |

All role variants share the same `grade-book-table` component; changes apply to all routes automatically.

---

## 3. Actors & RBAC

| Role | Route | Primary device | Benefit |
|---|---|---|---|
| Student | `/student/grades` | Mobile | Primary beneficiary — full horizontal scroll |
| Parent | `/parent/grades` | Mobile | Primary beneficiary — full horizontal scroll |
| Teacher | `/teacher/grades` | Desktop + tablet | Benefits on tablet |
| Principal | `/principal/grades` | Desktop + tablet | Benefits on tablet |
| Admin | (if grade access granted) | Desktop | Inherits fix automatically |

No role-gated visibility for the layout fix. All roles see the same component behaviour.

---

## 4. Functional Spec

### FR-1 — iOS touch momentum scroll on wrapper (TR-001, TR-NFR-003)

The system SHALL add `style={{ WebkitOverflowScrolling: 'touch' }}` to the existing scroll wrapper div at line 86 of `grade-book-table.tsx`. This element already has `overflow-x-auto rounded-[12px] border border-border bg-card shadow-card`. The inline style is required because Tailwind v4 has no utility for `-webkit-overflow-scrolling`.

**Exact change — line 86 wrapper div:**
```
// Before (existing class only):
<div className="overflow-x-auto rounded-[12px] border border-border bg-card shadow-card">

// After (add inline style):
<div
  className="overflow-x-auto rounded-[12px] border border-border bg-card shadow-card"
  style={{ WebkitOverflowScrolling: 'touch' }}
>
```

The scroll wrapper SHALL also have `role="region"` and `aria-label` from an existing i18n key (see FR-4).

### FR-2 — Minimum table width 640 px (TR-002)

The system SHALL add `min-w-[640px]` to the `<table>` element's className so no viewport causes columns to be crushed below their readable minimum. `min-width` is applied to the `<table>` itself, not the wrapper.

**Exact change — `<table>` element:**
- Add `min-w-[640px]` to the existing `<table>` className.

At viewports narrower than 640 px, the scroll wrapper's `overflow-x-auto` absorbs the overflow; the page itself does not scroll horizontally.

### FR-3 — Right border on sticky first-column cells (TR-003)

The system SHALL add `border-r border-border` to the className of every sticky first-column cell to create a visible separator between the sticky column and scrolling content.

**Exact changes:**

Line 95 — sticky `<th>` header cell (already has `sticky left-0 bg-card px-4 py-2`):
- Add `border-r border-border` to className.

Line 170 — sticky `<td>` data cells (already have `sticky left-0 bg-card px-4 py-2`):
- Add `border-r border-border` to className.

The `border-border` token maps to `var(--edu-border)` — no raw color. Background `bg-card` maps to `var(--edu-card)` — no raw color. Both are already applied; only the border-right is added.

z-index on sticky cells: the existing implementation must have `z-index: 1` (Tailwind: `z-[1]`) on sticky cells. If not already present, add `z-[1]` to the sticky cell classNames. z-index MUST NOT exceed 1 to avoid conflicting with modal/popover layers.

### FR-4 — Scroll container accessibility (TR-NFR-001)

The system SHALL add `role="region"` and `aria-label` to the scroll wrapper (the element with `overflow-x-auto`). The `aria-label` value MUST be sourced from an existing i18n key (e.g. a key under `grades.gradeBook.*`). No new i18n key is added. The FE team MUST confirm an existing key is suitable before implementation (see OQ-001).

### FR-5 — Scroll wrapper padding (TR-006)

The scroll wrapper SHALL have no internal horizontal padding so the sticky first column starts flush with the container's left edge. The current `overflow-x-auto` wrapper has no padding class — this must be confirmed during implementation and left as `p-0` if any padding is inadvertently present.

### FR-6 — Touch target on row actions (TR-005)

Any interactive element within a table row (e.g. grade drill-down button, row action icon) SHALL have a minimum touch target of ≥ 44 × 44 px at viewports < 640 px. The FE team MUST confirm presence/absence of row-level interactive elements; if present, add `min-h-[44px] min-w-[44px]` (or equivalent padding).

---

## 5. Non-Functional Requirements

| NFR | Target | Verification |
|---|---|---|
| **A11y — WCAG 2.1 AA (TR-NFR-001)** | DOM order of `<th>`/`<td>` elements unchanged; scroll container has `role="region"` + `aria-label` from existing i18n key; no WCAG 1.3.1 failure. Sticky cells at z-index 1 covered by modals (z-index > 1). | Storybook a11y addon; axe-core scan; confirm `role`/`aria-label` in DOM. |
| **Responsive — no page overflow at 320 px (TR-NFR-002)** | `document.documentElement.scrollWidth === document.documentElement.clientWidth` at 320 px; table is still 640 px wide; only the wrapper scrolls. | Chromium device-mode 320 px; Playwright scrollWidth assertion. |
| **iOS momentum scroll (TR-NFR-003)** | `-webkit-overflow-scrolling: touch` present on scroll wrapper element. | Inspect element inline style in DOM; manual iOS Safari test or BrowserStack. |
| **i18n (TR-NFR-004)** | Zero new keys in `vi.json` / `en.json`. | `git diff src/bootstrap/i18n/messages/` shows no additions. |
| **Responsive — 375 px** | Table scrolls horizontally within wrapper; no page overflow. | Storybook viewport story at 375 px. |
| **Responsive — 1280 px** | Table expands naturally; `min-w-[640px]` does not constrain it; no overflow. | Storybook viewport story at 1280 px. |
| **z-index layering (TR-004)** | Sticky cells z-index = 1; modals/popovers z-index > 1; no sticky cell bleeds above modal. | Visual inspection with a modal open over the table. |

---

## 6. Acceptance Criteria

**AC-01** — Horizontal scroll at 375 px
Given a Student is on the grade book screen at 375 px with grade data loaded,
When the table renders,
Then the scroll wrapper has `overflow-x: auto`; the `<table>` computed width is ≥ 640 px; horizontal scroll is available within the wrapper; `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

**AC-02** — No padding on scroll wrapper
Given the grade book table renders at any viewport,
When the scroll wrapper is inspected,
Then it has no internal horizontal padding creating a gap left of the sticky column.

**AC-03** — Scroll container accessibility
Given the grade book table renders,
When the scroll wrapper is inspected,
Then it has `role="region"` and a non-empty `aria-label` sourced from an existing i18n key; `vi.json` / `en.json` diff shows zero new key additions.

**AC-04** — Loading state at 375 px
Given the grade book screen is loading at 375 px,
When the skeleton renders inside the scroll wrapper,
Then the wrapper maintains `overflow-x: auto` and no page-level horizontal overflow occurs.

**AC-05** — Empty state at 375 px
Given the grade book screen loads with zero grade rows at 375 px,
When the empty state renders inside the scroll wrapper,
Then no `<table>` element is present; scroll wrapper has no scrollable overflow; empty-state container has `role="status"`. (Empty state canonical pattern is out of scope — US-E17.5.)

**AC-06** — Sticky header cell
Given the grade book table renders with data,
When the scroll wrapper is scrolled 100 px to the right,
Then the first-column `<th>` has `position: sticky` and `left: 0`; it remains visible at the left edge.

**AC-07** — Sticky data cells
Given the grade book table renders with data and the wrapper is scrolled right,
When sticky data cells are inspected,
Then each first-column `<td>` has `position: sticky`, `left: 0`, background from `bg-card` token (not a raw color), and `z-index: 1`.

**AC-08** — Right border on sticky cells
Given the grade book table renders with data,
When first-column cells are inspected,
Then each sticky cell has `border-right: 1px solid var(--edu-border)` (applied via `border-r border-border` Tailwind classes).

**AC-09** — z-index modal layering
Given a modal or popover opens over the grade book table,
When the overlay renders,
Then the overlay z-index > 1; sticky column cells (z-index 1) are visually covered by the overlay.

**AC-10** — iOS momentum scroll applied
Given the grade book scroll wrapper is rendered,
When its inline styles are inspected,
Then `-webkit-overflow-scrolling: touch` is on the same element as `overflow-x: auto`.

**AC-11** — Table min-width at 375 px
Given the grade book screen renders at 375 px,
When the `<table>` is measured,
Then its computed width is ≥ 640 px.

**AC-12** — Table min-width at 320 px
Given the grade book screen renders at 320 px,
When the `<table>` is measured,
Then its computed width is ≥ 640 px; `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

**AC-13** — Table expands naturally at desktop
Given the grade book screen renders at 1280 px,
When the `<table>` is measured,
Then its width is > 640 px (fills container); `min-w-[640px]` does not artificially constrain it.

**AC-14** — Loading state — no layout shift
Given the grade book transitions from loading skeleton to loaded table,
When real rows replace the skeleton,
Then scroll wrapper dimensions are unchanged; CLS contribution ≈ 0.

**AC-15** — Student view mobile
Given a Student is on `/student/grades` at 375 px with grades loaded,
When the table renders,
Then `overflow-x: auto`, sticky first column (subject name), and `min-w-[640px]` are all present.

**AC-16** — Parent view mobile
Given a Parent is on `/parent/grades` at 375 px,
When the table renders,
Then same mobile scroll behavior as AC-15 applies.

**AC-17** — Teacher view tablet
Given a Teacher is on `/teacher/grades` at 768 px,
When the table renders,
Then scroll wrapper is present; if table width exceeds 768 px it is horizontally scrollable; sticky first column is visible.

**AC-18** — Row action touch target (conditional)
Given a table row contains a tappable action element and viewport < 640 px,
When the element renders,
Then its computed hit area is ≥ 44 × 44 px. (N/A if no interactive row elements exist.)

---

## 7. Dependencies

- **Depends on:** none
- **Blocks:** US-E17.5 (grade book empty state renders inside this table's scroll wrapper — the wrapper structure established here is the container US-E17.5 will place the canonical empty state inside)
- **Feature modules touched:** `src/components/shared/grade-book-table/`
- **Shared contracts:** `grade-book-table` is a shared component used by teacher, principal, student, and parent grade routes; changes are single-source and propagate to all routes automatically

---

## 8. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
|---|---|---|---|---|
| TR-001 — Horizontal scroll wrapper + `-webkit-overflow-scrolling` | requirements.md | UC-01, UC-03 | None (CSS only) | Must |
| TR-002 — Minimum table width 640 px | requirements.md | UC-04 | None | Must |
| TR-003 — Sticky first column | requirements.md | UC-02 | None | Must |
| TR-004 — Sticky z-index = 1 | requirements.md | UC-02 (AC-09) | None | Must |
| TR-005 — Touch target on row actions | requirements.md | UC-07 (AC-18) | None | Should |
| TR-006 — Scroll wrapper padding = 0 | requirements.md | UC-01 (AC-02) | None | Must |
| TR-NFR-001 — WCAG AA / role+aria-label | requirements.md | UC-01 (AC-03), UC-06 | None | Must |
| TR-NFR-002 — No page overflow at 320 px | requirements.md | UC-04 (AC-12) | None | Must |
| TR-NFR-003 — Touch momentum scroll | requirements.md | UC-03 (AC-10) | None | Should |
| TR-NFR-004 — No new i18n keys | requirements.md | UC-01 (AC-03) | None | Must |

---

## 9. Open Questions

**[OQ-001]** `TR-NFR-001` and `AC-03` require `aria-label` on the scroll wrapper from an existing i18n key (assumed under `grades.gradeBook.*`). The FE team MUST confirm a suitable key exists before implementation. If no key is present, `ba-lead` must authorize adding one targeted key (`vi` source + `en` mirror), which would invalidate the "zero new keys" constraint and require a requirements delta.

**[OQ-002]** `src/features/grades/presentation/grade-book-screen/` (referenced in requirements.md) vs. `src/components/shared/grade-book-table/grade-book-table.tsx` (confirmed in implementation facts). The FE team must confirm no role-specific grade-book wrapper applies a conflicting `overflow` style that would override this fix.

**[OQ-003]** Grade Entry and Grade Approval screens may embed `grade-book-table`. If they do, they will inherit these mobile scroll changes. The FE team should verify whether the inherited behavior is desirable or requires a scoping guard.
