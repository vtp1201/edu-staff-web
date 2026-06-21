# Feature Spec — Touch Target ≥44px on Mobile (US-E17.11)

**Status:** Draft
**Lane:** normal
**Priority:** P2
**Sources:** requirements.md + use-cases.md (this packet) · DR-011 §UX-08 · design-spec.jsonc#interactionPatterns.touchTarget · E17-ux-polish epic

---

## 1. Scope & Objectives

**Purpose:** Enforce WCAG 2.5.5 AA minimum 44×44px touch target on interactive rows in the grade-book table and discipline violation log rows. A sticky first column is added to the grade table for horizontal-scroll usability on mobile.

**In scope:**
- `src/components/shared/grade-book-table/grade-book-table.tsx` — add `min-h-[44px]` to data row cells + sticky first column (`position: sticky; left: 0; bg-card; z-10`)
- `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx` — add `py-2.5 min-h-[44px]` to violation row containers
- Icon-only action buttons within affected rows — add `min-h-[44px] min-w-[44px]`
- `student-conduct-screen.tsx` if FE verifies it uses the same violation row markup

**Out of scope:**
- US-E17.2 changes (horizontal scroll setup, `min-w-[640px]`, `border-r`) — separate story; this story only adds `min-h-[44px]` and `z-10/bg-card` to the already-sticky column
- Grade table header row touch target (header cells are not interactive tappable elements)
- Pagination controls touch target
- Any screen not listed above

**Definitions:**
- *Touch target:* The tappable/clickable area of an interactive element; must be ≥44×44px per WCAG 2.5.5 AA
- *Sticky first column:* A table column with `position: sticky; left: 0` that remains visible during horizontal scroll

---

## 2. Actors & Roles

| Actor | Role | Affected Screen |
|---|---|---|
| Teacher | Internal | Grade book (entry view) + discipline violation rows |
| Principal | Internal | Grade book (read-only) + discipline violation rows |
| Student | Internal | Grade book (student grade view) |
| Parent | External | Grade book (parent grade view) |

All roles see the same layout improvement. No role-specific visibility differences.

---

## 3. Functional Requirements

### FR-001 — Grade Table Data Row Min Height
**Priority:** Must
**Source:** TR-E17.11-FR-001 / UC-E17.11-001

The system SHALL add `min-h-[44px]` (Tailwind `min-h-11`) to each data row cell (`<td>` or row container) in `grade-book-table.tsx`. Row height expands with content if content is taller than 44px.

**AC:**
- Given grade-book table on 375px viewport with at least one data row, Then every row container has computed height ≥44px.
- Given a cell's content is taller than 44px, Then row expands to fit content (min-height, not fixed height).
- Given change applied to `grade-book-table.tsx`, Then all consumers (teacher grade entry, parent grade view, student grade view) inherit the 44px minimum without individual file changes.

---

### FR-002 — Grade Table Sticky First Column
**Priority:** Must
**Source:** TR-E17.11-FR-002 / UC-E17.11-002

The system SHALL ensure the first column cell has `position: sticky`, `left: 0`, `bg-card`, `z-10` so it remains visible during horizontal scroll on mobile.

**AC:**
- Given grade table has horizontal overflow (from US-E17.2 `min-w-[640px]`) and viewport is 375px, When user scrolls horizontally, Then first column remains fixed; remaining columns scroll underneath.
- Given sticky column CSS inspected, Then `position: sticky`, `left: 0`, `background-color: var(--card)` (bg-card), `z-index: 10`.
- Given a modal/dialog is displayed over the table, Then dialog renders above sticky column (z-10 < modal z-index; no collision).

**Dependency on US-E17.2:** If US-E17.2 has NOT been merged, the sticky column has no scrollable context and has no visible effect. FE must document this in the branch claim check per parallel-workflow.md.

---

### FR-003 — Discipline Violation Row Min Height
**Priority:** Must
**Source:** TR-E17.11-FR-003 / UC-E17.11-003

The system SHALL add `py-2.5 min-h-[44px]` to violation row containers in `discipline-screen.tsx`.

**AC:**
- Given discipline screen on 375px with at least one violation, Then each violation row has computed height ≥44px and `py-2.5` (10px top + bottom padding).
- Given multiple violation rows, Then `py-2.5` provides visible vertical separation between rows.

---

### FR-004 — Icon-Only Action Buttons Within Rows
**Priority:** Must
**Source:** TR-E17.11-FR-004 / UC-E17.11-004

The system SHALL apply `min-h-[44px] min-w-[44px]` to icon-only action buttons (edit, delete triggers) in grade table rows and violation rows.

**AC:**
- Given a row contains icon-only action buttons, Then each button has `min-height: 44px` and `min-width: 44px`.
- Given icon-only buttons, When user navigates via Tab, Then each button receives focus independently with a visible focus ring (`--ring` token).

---

### FR-005 — Breakpoint Scoping (Optional Desktop Density)
**Priority:** Should
**Source:** TR-E17.11-FR-005 / UC-E17.11-001

If adding `min-h-[44px]` unconditionally causes unacceptable density on desktop (e.g. 30+ rows at 44px), FE MAY apply `md:min-h-auto` to restore desktop natural height. Mobile constraint (`min-h-[44px]` below md) must not be removed.

**Recommended default (OQ-E17.11-01):** Apply `min-h-[44px]` unconditionally to all viewports. Design-spec allows unconditional application; 44px is not visually jarring at the 13–14px body font size. FE verifies desktop density with a real 30-row table and applies `md:min-h-auto` only if the density is genuinely problematic. The decision must be documented in the implementation commit.

**AC:**
- Given grade table has 30 rows at `min-h-[44px]`, Then table body height (~1320px) is within normal scroll context on desktop, or `md:min-h-auto` applied with mobile minimum preserved.

---

## 4. Non-Functional Requirements

### NFR-001 — Accessibility: WCAG 2.5.5 Touch Target
**Source:** TR-E17.11-NFR-001
All interactive row elements and icon-only buttons in grade table and violation log ≥44×44px on 375px viewport.
**Measurable target:** WCAG 2.5.5 AA; every interactive element ≥44px height at 375px; verified by `fe-accessibility-auditor`.

### NFR-002 — Sticky Column Z-Index: No Conflicts
**Source:** TR-E17.11-NFR-002
Sticky column `z-10` must not create z-index conflicts with sticky table header or overlay/modal.
**Measurable target:** No visual z-index collision at 375/768px; sticky column header intersection verified.

### NFR-003 — Desktop Density Acceptable
**Source:** TR-E17.11-NFR-003
`min-h-[44px]` addition must not cause unacceptable density degradation on desktop.
**Measurable target:** FE verifies with 30-row table at 1280px; applies `md:min-h-auto` if needed.

### NFR-004 — No New Tokens: Tailwind Utilities Only
**Source:** TR-E17.11-NFR-004
All changes use Tailwind utility classes (`min-h-11`, `py-2.5`, `sticky`, `z-10`, `bg-card`). Zero new entries in `src/app/tokens.css`.
**Measurable target:** `bunx tsc --noEmit` passes; Biome lint passes; zero new token additions.

---

## 5. UI States & Flows

| State | Trigger | Visual |
|---|---|---|
| `default` | Grade table or violation log renders | All data rows ≥44px tall; first grade column sticky |
| `desktop-compact` (optional) | FR-005 applied | Grade table rows at natural height on desktop (md:min-h-auto); mobile still ≥44px |
| `sticky-column-scroll` | User scrolls grade table horizontally on mobile | First column stays visible; other columns scroll underneath |

**Cross-file dependency:** US-E17.11 (`min-h-[44px]` + `z-10/bg-card`) and US-E17.2 (`-webkit-overflow-scrolling: touch`, `min-w-[640px]`, `border-r`) both modify `grade-book-table.tsx`. These changes are **non-overlapping** but target the same file. FE MUST NOT claim both stories simultaneously on different branches — the parallel branch claim check (`.claude/rules/parallel-workflow.md`) must verify this.

---

## 6. Data & Integration

No backend integration. Layout-only changes to two existing files. Data comes from existing grade and discipline data sources.

**External dependencies:**
- No new libraries or primitives
- Tailwind utility classes only (`min-h-11`, `py-2.5`, `sticky`, `z-10`, `bg-card`)

---

## 7. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|---|---|---|---|
| UC-E17.11-001 | Grade Table Data Rows at 44px Minimum Height | FR-001, FR-005 | AC-01 through AC-05 |
| UC-E17.11-002 | Sticky First Column During Horizontal Scroll | FR-002 | AC-06 through AC-09 |
| UC-E17.11-003 | Discipline Violation Rows at 44px Minimum Height | FR-003 | AC-10 through AC-12 |
| UC-E17.11-004 | Icon-Only Action Buttons Within Rows | FR-004 | AC-13, AC-14 |

---

## 8. Constraints & Assumptions

**Technical constraints:**
- Sticky column `z-10` must be verified lower than any overlay modal/dialog z-index. If collision occurs, FE adjusts layering.
- `min-h-[44px]` on `<td>` may require `display: flex` or `align-items: center` in some browser rendering contexts — FE verifies.

**Confirmed assumptions:**
- [ASSUMPTION] `grade-book-table.tsx` is the shared canonical implementation for all grade table views. One change propagates to all consumers.
- [ASSUMPTION] `student-conduct-screen.tsx` uses the same violation row markup as `discipline-screen.tsx`. **FE must verify at implementation.** If same markup → apply `py-2.5 min-h-[44px]` to both files. If different → scope adjustment required.
- [ASSUMPTION] US-E17.2 is either already merged or will be coordinated on the same branch to give the sticky column a scrollable context.

**[OPEN QUESTION] OQ-E17.11-01:** Should `min-h-[44px]` be applied unconditionally to all viewports or scoped below `md`? **Recommended default:** Apply unconditionally. 44px is not visually jarring on desktop at 13–14px font. FE verifies with a 30-row table and documents the decision.

**[OPEN QUESTION] OQ-E17.11-02:** Does `student-conduct-screen.tsx` use the same violation row markup as `discipline-screen.tsx`? **Recommended default:** FE audits at implementation. If same markup, apply same fix; if different, document the scope adjustment.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-001 (Grade row min-h) | TR-E17.11-FR-001 + design-spec.jsonc#touchTarget.patterns.gradeTable.dataCell | UC-E17.11-001 | None | Must |
| FR-002 (Sticky first column) | TR-E17.11-FR-002 + design-spec.jsonc#touchTarget.patterns.gradeTable.stickyFirstColumn | UC-E17.11-002 | Cross-ref: US-E17.2 (same file) | Must |
| FR-003 (Violation row min-h) | TR-E17.11-FR-003 + design-spec.jsonc#touchTarget.patterns.auditLogViolationRows | UC-E17.11-003 | None | Must |
| FR-004 (Icon-only buttons 44px) | TR-E17.11-FR-004 + design-spec.jsonc#touchTarget.patterns.iconOnlyButtons | UC-E17.11-004 | None | Must |
| FR-005 (Breakpoint scoping) | TR-E17.11-FR-005 | UC-E17.11-001 | None | Should |
| NFR-001 (WCAG 2.5.5) | TR-E17.11-NFR-001 | UC-E17.11-001–004 | None | Must |
| NFR-002 (Sticky z-index) | TR-E17.11-NFR-002 | UC-E17.11-002 (AC-08) | None | Must |
| NFR-003 (Desktop density) | TR-E17.11-NFR-003 | UC-E17.11-001 (AC-04) | None | Should |
| NFR-004 (No new tokens) | TR-E17.11-NFR-004 | All UCs (AC-05) | None | Must |

**No i18n keys required for US-E17.11. All changes are layout/CSS utilities only.**

---

## 10. Handoff to FE

**What `fe-lead` should build:**

1. **`grade-book-table.tsx`:** Add `min-h-[44px]` to data row cells; add `position: sticky; left: 0; bg-card; z-10` to first column cells. Verify no regression on US-E17.2 changes (AC-E17.11-15).
2. **`discipline-screen.tsx`:** Add `py-2.5 min-h-[44px]` to violation row containers.
3. **`student-conduct-screen.tsx`:** Audit — if same markup as discipline-screen, apply same fix; document decision.
4. **Icon-only action buttons:** Add `min-h-[44px] min-w-[44px]` to edit/delete triggers within affected rows.
5. **Storybook proof:** Add 375px viewport story to `grade-book-table.stories.tsx` and `discipline-screen.stories.tsx` asserting ≥44px row height and sticky column behavior.

**Lane:** normal

**Claim check required:** `grade-book-table.tsx` is also modified by US-E17.2. Per `.claude/rules/parallel-workflow.md`, FE must verify US-E17.2 is not simultaneously in-flight before claiming US-E17.11. Non-overlapping changes but same file = coordination required.

**Proof owed (TEST_MATRIX rows):**

| Layer | Expected proof |
|---|---|
| Unit | Vitest: `min-h-[44px]` class on grade table row; `sticky left-0 bg-card z-10` on first column; `py-2.5 min-h-[44px]` on violation rows |
| Integration | None |
| E2E | Storybook: 375px viewport asserting ≥44px row height and sticky column during horizontal scroll |
| Platform | Manual 375px device-mode test for touch target and sticky column behavior |
