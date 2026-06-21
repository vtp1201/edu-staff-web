# Spec — US-E17.5 Empty State — Grade Book Table

**Status:** Planned | **Lane:** normal
**Sources:** requirements.md · use-cases.md · `docs/product/design-spec.jsonc` (`emptyStatePattern`, `emptyStates.gradebook.gradeTable`, `responsiveGrid.gradeTable`)

---

## 1. Overview

The grade book screen has a local `EmptyState` component that renders a bare dashed-border text box when no grades exist (`vm.gradeBook === null`). This story replaces it with the canonical `emptyStatePattern`. Additionally, the shared `GradeBookTable` component is missing iOS momentum scroll properties and a sticky column separator border — these mobile completions are included in this story's scope.

**In scope:**
- `src/features/grades/presentation/grade-book-screen/grade-book-screen.tsx` (lines ~194–205): swap local `EmptyState` with canonical pattern
- `src/components/shared/grade-book-table/grade-book-table.tsx`: add `-webkit-overflow-scrolling: touch`, `min-width: 640px` on `<table>`, `border-right` on sticky column
- `src/components/shared/grade-book-table/grade-book-table.stories.tsx`: add or update `MobileScroll` story

**Out of scope:**
- The "no selection" prompt (`hasSelection === false`, ~line 172) — unchanged
- `GradeBookSkeleton` loading state — unchanged
- Error banner — unchanged
- Grade entry, approval, or publishing logic
- Responsive stat-grid fix (US-E17.1)

**Definitions:**
- *Canonical empty state* — the `emptyStatePattern` from `docs/product/design-spec.jsonc`: `role="status"` container, centered column, `FileText` icon 64px `text-edu-text-muted` `aria-hidden`, `<p>` title 16px/700 `text-foreground` `mt-4`, no CTA.
- *Empty condition* — `vm.gradeBook === null` AND `hasSelection === true` after a successful (non-error, non-loading) fetch.
- *No-selection condition* — `hasSelection === false`; this renders the existing no-selection prompt and is out of scope.

---

## 2. Actors & Roles

| Role | Route | Primary device |
|---|---|---|
| Teacher | `/teacher/grade-book` | Desktop |
| Principal | `/principal/grade-book` | Desktop |
| Admin | `/admin/grade-book` | Desktop |
| Student | `/student/grades` | Mobile-first |
| Parent | `/parent/grades` | Mobile-first (child switcher) |

All five roles see the same canonical empty state when `vm.gradeBook === null`. Student and Parent are the primary beneficiaries of the mobile scroll completions.

---

## 3. Functional Requirements

### FR-01 — Grade book "no grades" empty state (canonical pattern)

**Priority:** Must | **Source:** TR-001, UC-01 | **Design-spec key:** `emptyStates.gradebook.gradeTable`

The system SHALL render the canonical empty state in `grade-book-screen.tsx` when `vm.gradeBook === null` AND `hasSelection === true` after a successful (non-error, non-loading) fetch.

- Container: `role="status"`, `aria-live="polite"`, `flex flex-col items-center text-center px-5 py-10`
- Icon: `FileText` (Lucide), `size-16` (64px), `text-edu-text-muted`, `aria-hidden="true"`
- Title: `<p className="text-base font-bold text-foreground mt-4">` — i18n namespace `"gradeBook"`, key `"emptyState"` ("Chưa có điểm")
  - i18n call: `useTranslations("gradeBook")` — NOT `useTranslations("grades")` or `useTranslations("grades.gradeBook")`
- Body: omitted (key is a short self-contained title; no separate body key exists)
- CTA: none (`hasCTA: false`)
- The legacy dashed-border `EmptyState` component SHALL be replaced entirely

**AC:** AC-01.1 through AC-01.13 (see §7)

**i18n note:** `docs/product/design-spec.jsonc` references `grades.gradeBook.emptyState` — this is a typo in the design spec. The actual i18n namespace verified in `vi.json` is `gradeBook` with key `emptyState`. The FE team MUST use `useTranslations("gradeBook")`.

---

### FR-02 — "No selection" prompt unchanged

**Priority:** Should | **Source:** TR-002, UC-02

The system SHALL leave the no-selection prompt (`hasSelection === false`) entirely unchanged. The canonical empty state container with `role="status"` SHALL NOT be rendered when `hasSelection === false`.

**AC:** AC-02.1, AC-02.2 (see §7)

---

### FR-03 — Grade table mobile scroll completions

**Priority:** Must | **Source:** TR-003, UC-03

The `GradeBookTable` shared component SHALL be updated:

1. Scroll wrapper: add `-webkit-overflow-scrolling: touch` (Tailwind `[overflow-scrolling:touch]` or equivalent inline style). Must be on the scroll wrapper element, not the `<table>`.
2. Table element: add `min-width: 640px` so columns do not collapse at 375px viewport.
3. Sticky first column (`<th>` and `<td>` with `sticky left-0`): add `border-right: 1px solid var(--edu-border)` to visually separate from scrolled content.
4. Sticky first column background: `bg-edu-card` (or `background: var(--edu-card)`) to prevent text bleed from scrolled columns.

**AC:** AC-03.1 through AC-03.6 (see §7)

**Dependencies:** none (self-contained to the shared component)

---

### FR-04 — Loading and error states unchanged

**Priority:** Must | **Source:** TR-004, UC-05, UC-06

`GradeBookSkeleton` and the error banner SHALL remain exactly as implemented. Any regression in these states is a defect.

**AC:** AC-05.1, AC-06.1 (see §7)

---

## 4. Non-Functional Requirements

### NFR-01 — Accessibility (WCAG 2.1 AA)

- **Target:** `role="status"` AND `aria-live="polite"` on the empty state container; `aria-hidden="true"` on the `FileText` icon; no `<h2>`/`<h3>` inside the container; title `var(--edu-text-primary)` = 9.4:1 (PASS). No body text — muted-color advisory does not apply.
- Sticky column background `var(--edu-card)` ensures text from scrolled columns does not bleed behind fixed cells.
- **How QA verifies:** Storybook `EmptyState` story `play()` asserting `role="status"`, `aria-live="polite"`, and `aria-hidden="true"` on icon SVG.

### NFR-02 — Touch (iOS momentum scroll)

- **Target:** The scroll wrapper of `GradeBookTable` has `-webkit-overflow-scrolling: touch`. iOS momentum scroll continues after finger lift.
- **How QA verifies:** `MobileScroll` Storybook story rendered in a 375px container; DOM inspection of the scroll wrapper element.

### NFR-03 — i18n (zero new keys)

- **Target:** `vi.json` and `en.json` diff is empty. Uses existing `gradeBook.emptyState`.
- **How QA verifies:** `bunx tsc --noEmit` passes with `useTranslations("gradeBook")` call; no key additions in messages diff.

### NFR-04 — No token additions

- **Target:** `src/app/tokens.css` diff is empty. All colors from existing tokens.
- **How QA verifies:** `git diff src/app/tokens.css` shows no changes.

### NFR-05 — Responsive

- **Target:** No horizontal overflow of the scroll wrapper at 320px, 375px viewports. Empty state title fits within `max-w-xs` at 320px.
- **How QA verifies:** `MobileScroll` Storybook story at 375px; visual inspection at 320px minimum.

---

## 5. UI States & Flows

`grade-book-screen.tsx` state machine (unchanged structure; only the empty state visual is upgraded):

```
[mount / selection change]
  → Loading (GradeBookSkeleton) ──fetch resolves, gradeBook non-null──→ Populated (GradeBookTable)
                                  ──fetch resolves, gradeBook null──────→ Empty (canonical empty state)  [UPGRADED]
                                  ──fetch fails──────────────────────→ Error (existing error banner)
  [hasSelection false] → No-selection prompt (unchanged)
```

Only one state is rendered at a time. The no-selection prompt is a separate branch driven by `hasSelection === false` and is not part of the empty state machine.

**Key flows referencing UCs:**
- UC-01: grade book "no grades" empty state
- UC-02: no-selection prompt unchanged
- UC-03: mobile scroll — scroll wrapper and table min-width
- UC-04: mobile scroll — role parity across all five roles
- UC-05: loading skeleton unchanged
- UC-06: error state unchanged

---

## 6. Data & Integration

No new backend integration. `grade-book-screen.tsx` consumes `vm.gradeBook` from the existing TanStack Query hook binding the grades service. The empty state condition (`vm.gradeBook === null`) is client-side logic with no new API call. `GradeBookTable` is a presentational shared component with no data-fetch logic.

---

## 7. Acceptance Criteria

### AC-01: Grade Book "No Grades" Empty State (FR-01, UC-01)

**AC-01.1** — Given `vm.gradeBook === null` and `hasSelection === true` after a successful fetch, when the grade-book-screen renders, then the empty state container has both `role="status"` and `aria-live="polite"`.

**AC-01.2** — Given the above, when the container is inspected, then it has `padding: 40px 20px` (`px-5 py-10`), `text-align: center`, and flex column alignment centered on both axes.

**AC-01.3** — Given the empty state is rendered, when the DOM is inspected, then a `FileText` icon element is present with `aria-hidden="true"`, 64px size, and class `text-edu-text-muted`.

**AC-01.4** — Given the empty state is rendered, when the DOM is inspected, then a `<p>` element contains "Chưa có điểm" (resolved from namespace `gradeBook`, key `emptyState`), with `font-size: 16px`, `font-weight: 700`, and color `var(--edu-text-primary)`.

**AC-01.5** — Given the empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-01.6** — Given the empty state is rendered, when the DOM is inspected, then no secondary body text `<p>` is present (title is self-contained).

**AC-01.7** — Given the empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element is inside the container.

**AC-01.8** — Given the empty state is rendered, when the DOM is inspected, then no element with a dashed border or the legacy `EmptyState` component's distinct classes is present.

**AC-01.9** — Given the grade-book screen translates the title, when the translation is called, then it uses namespace `"gradeBook"` (not `"grades"` or `"grades.gradeBook"`), key `"emptyState"`.

**AC-01.10** — Given the grade book fetch is pending, when the component renders, then `GradeBookSkeleton` is present in the DOM and the `role="status"` container is NOT present.

**AC-01.11** — Given the grade book fetch has failed, when the component renders, then the error banner is present and the `role="status"` container is NOT present.

**AC-01.12** — Given the grade book fetch returns non-null grade data, when the component renders, then the grade table is present and the `role="status"` container is NOT present.

**AC-01.13** — Given any of Teacher, Principal, Admin, Student, or Parent is authenticated and their respective grade book screen shows `vm.gradeBook === null`, when the component renders, then the same canonical empty state (FileText + `gradeBook.emptyState` title) is shown with no role-specific variation.

---

### AC-02: "No Selection" Prompt Unchanged (FR-02, UC-02)

**AC-02.1** — Given `hasSelection === false`, when the grade-book-screen renders, then the `role="status"` canonical empty state container is NOT present and the existing no-selection prompt element IS present.

**AC-02.2** — Given `hasSelection === false`, when the DOM is inspected, then the no-selection prompt's text content and styling are unchanged from the pre-story implementation.

---

### AC-03: Grade Table Mobile Scroll (FR-03, UC-03)

**AC-03.1** — Given `GradeBookTable` is rendering grade data, when the scroll wrapper element is inspected, then it has `-webkit-overflow-scrolling: touch` applied.

**AC-03.2** — Given `GradeBookTable` is rendering, when the `<table>` element is inspected, then it has a computed `min-width` of 640px.

**AC-03.3** — Given `GradeBookTable` is rendering, when the sticky first-column `<th>` and `<td>` elements are inspected, then each has `border-right: 1px solid var(--edu-border)`.

**AC-03.4** — Given the grade table is rendering on a 375px viewport, when the user scrolls horizontally, then the sticky first-column cells have background `var(--edu-card)` and no text from scrolled columns bleeds visually behind them.

**AC-03.5** — Given the grade table renders at 375px viewport width, when the DOM is inspected, then the scroll wrapper does not create horizontal overflow on the page; horizontal scroll is contained within the wrapper.

**AC-03.6** — Given the `grade-book-table.stories.tsx` file, when stories are listed, then a story named `MobileScroll` is present and renders the table in a 375px-wide container.

---

### AC-04: Mobile Scroll — Role Parity (UC-04)

**AC-04.1** — Given a Student viewing `/student/grades` with non-null grade data, when `GradeBookTable` renders, then the scroll wrapper has `-webkit-overflow-scrolling: touch` and the table has `min-width: 640px`.

**AC-04.2** — Given a Parent viewing `/parent/grades` using the child switcher, when the new child's grade data loads and `GradeBookTable` renders, then the scroll wrapper still has `-webkit-overflow-scrolling: touch` and the sticky column retains its `border-right`.

**AC-04.3** — Given Teacher, Principal, or Admin viewing the grade book with non-null data, when the grade table renders, then `min-width` and `border-right` are present and do not cause layout breakage at 1280px.

---

### AC-05: Loading Skeleton Unchanged (FR-04, UC-05)

**AC-05.1** — Given the grade book fetch is pending, when the component renders, then `GradeBookSkeleton` is present and neither the canonical empty state container nor the grade table is present.

---

### AC-06: Error State Unchanged (FR-04, UC-06)

**AC-06.1** — Given the grade book fetch has failed, when the component renders, then the error banner is present and neither the canonical empty state container nor the skeleton is present.

---

## 8. Use Case Summary

| UC ID | Title | FR coverage | AC count |
|---|---|---|---|
| UC-01 | Grade Book "No Grades" Empty State | FR-01, FR-04 | 13 |
| UC-02 | "No Selection" Prompt Unchanged | FR-02 | 2 |
| UC-03 | Grade Table Mobile Scroll — Wrapper and Min-Width | FR-03 | 6 |
| UC-04 | Mobile Scroll Correctness — All Five Roles | FR-03 | 3 |
| UC-05 | Loading Skeleton Unchanged | FR-04 | 1 |
| UC-06 | Error State Unchanged | FR-04 | 1 |

---

## 9. Constraints & Assumptions

- [CONFLICT] `docs/product/design-spec.jsonc` references `grades.gradeBook.emptyState` as the i18n key. The actual namespace verified in `vi.json` is `gradeBook` with key `emptyState`. The spec-writer judgment: use `useTranslations("gradeBook")` with key `"emptyState"` — the design-spec entry is a typo. FE team must use the verified namespace.
- [OPEN QUESTION OQ-01] Does a `MobileScroll` story already exist in `grade-book-table.stories.tsx` from US-E17.2? If so, update it rather than creating a duplicate. FE team must check before authoring.
- [OPEN QUESTION OQ-02] `aria-live="polite"` is additive beyond the base `emptyStatePattern` (which specifies only `role="status"`). It is included here because grade selection can change dynamically. If the product owner prefers strict conformance with the base pattern only, `aria-live` can be dropped.
- [OPEN QUESTION OQ-03] For Parent on `/parent/grades` with child switcher: when the parent switches children and the new child has `gradeBook === null`, the title remains generic ("Chưa có điểm"). If personalization is needed, a new i18n key and BA review would be required — out of scope for this story.
- No new tokens. No new i18n keys. No BE changes.

---

## 10. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-01: canonical empty state (`gradeBook === null`) | TR-001, `emptyStates.gradebook.gradeTable` | UC-01, UC-05, UC-06 | grades service (mock or real) — no new call | Must |
| FR-02: no-selection prompt unchanged | TR-002 | UC-02 | none | Should |
| FR-03: mobile scroll completions | TR-003, `responsiveGrid.gradeTable` | UC-03, UC-04 | none | Must |
| FR-04: loading + error states unchanged | TR-004 | UC-05, UC-06 | none | Must |
| NFR-01: WCAG AA (`role="status"`, `aria-live`, `aria-hidden`) | TR-NFR-001 | UC-01 | none | Must |
| NFR-02: iOS touch scroll | TR-NFR-002 | UC-03, UC-04 | none | Should |
| NFR-03: zero new i18n keys | TR-NFR-003 | UC-01 | none | Should |
| NFR-04: zero new tokens | TR-NFR-004 | UC-01, UC-03 | none | Should |
| NFR-05: responsive 320px | (implied by `emptyStatePattern`) | UC-01, UC-03 | none | Must |

---

## 11. Handoff to FE

**What `fe-lead` should build:**

Two file targets + one story update:

1. **`grade-book-screen.tsx` (~lines 194–205):** Remove the local `EmptyState` component (dashed-border text box). Replace the conditional that renders it with the canonical empty state:
   - Container: `role="status"` `aria-live="polite"` `flex flex-col items-center text-center px-5 py-10`
   - Icon: `<FileText className="size-16 text-edu-text-muted" aria-hidden="true" />`
   - Title: `<p className="text-base font-bold text-foreground mt-4">{t("emptyState")}</p>` where `t = useTranslations("gradeBook")`
   - The existing `hasSelection === false` branch (no-selection prompt, ~line 172) is untouched.

2. **`grade-book-table.tsx`:** Apply the three mobile scroll completions described in FR-03 (scroll wrapper `-webkit-overflow-scrolling`, table `min-width: 640px`, sticky column `border-right` + `bg-edu-card`).

3. **`grade-book-table.stories.tsx`:** Add (or update if it exists from US-E17.2) a `MobileScroll` story at 375px container width.

**Storybook for the empty state:** `grade-book-screen.stories.tsx` (or equivalent) must include an `EmptyState` story with `play()` asserting:
- Container has `role="status"` and `aria-live="polite"`
- Icon SVG has `aria-hidden="true"`
- No `<h2>` / `<h3>` inside container
- No `<button>` inside container
- No dashed-border element present

**TDD proof required:**
- Unit / component tests (Vitest): `vm.gradeBook === null` + `hasSelection === true` renders canonical pattern; `hasSelection === false` does NOT render `role="status"` container; loading and error states suppress the canonical container.

**Lane:** normal

**TEST_MATRIX rows to create:** FR-01 (unit: AC-01.3, AC-01.8–01.12), FR-03 (unit: AC-03.1–03.5), NFR-01 (Storybook play: `role="status"` + `aria-live` + `aria-hidden`), FR-03/Storybook (AC-03.6 MobileScroll story).
