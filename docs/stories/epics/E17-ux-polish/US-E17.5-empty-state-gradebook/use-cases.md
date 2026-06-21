# Use Cases — US-E17.5 Empty State — Grade Book

## 1. Use Case Scope Summary

**Total UCs:** 6
**Actors:** Teacher, Principal, Admin, Student, Parent
**Boundaries:** `grade-book-screen.tsx` (empty state swap) and `grade-book-table.tsx` (mobile scroll completions). No new tokens, i18n keys, or BE changes. The canonical `emptyStatePattern` applies only when `vm.gradeBook === null` after a successful fetch. The no-selection state and loading/error states are explicitly out of scope for change.

---

## 2. Actor Catalogue

| Actor / Role | Type | Primary Device | Notes |
|---|---|---|---|
| Teacher | Staff | Desktop | Views and enters grades |
| Principal | Staff | Desktop | Read-only grade review |
| Admin | Staff | Desktop | System-wide grade oversight |
| Student | Student | Mobile-first | Views own grades; sticky column fix is most impactful |
| Parent | Guardian | Mobile-first | Views child grades via child switcher; sticky column fix is most impactful |

---

## 3. Use Case Catalogue

### UC-01: Grade Book "No Grades" Empty State

**Goal:** Replace the bare dashed-border text box with the canonical empty state when `vm.gradeBook === null` after a successful fetch and a class/subject has been selected.
**Primary Actor:** Teacher, Principal, Admin, Student, Parent
**Secondary Actors:** none
**Preconditions:**
- User is authenticated in any of the five roles.
- A class and/or subject selection has been made (`hasSelection === true`).
- The grade book data fetch has completed successfully (non-error).
- `vm.gradeBook === null` (no grade data returned by the API for the current selection).
- Component is not in loading state.

**Main Success Scenario:**
1. Grade book fetch completes successfully; `vm.gradeBook` is `null`.
2. System removes the legacy dashed-border `EmptyState` component.
3. System renders a container with `role="status"`, `aria-live="polite"`, centered column layout, `padding: 40px 20px`.
4. System renders a `FileText` Lucide icon at 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`.
5. System renders a `<p>` element with the i18n text from namespace `gradeBook`, key `emptyState` ("Chưa có điểm"), 16px / font-weight 700, color `var(--edu-text-primary)`, `margin-top: 16px`.
6. No CTA is rendered.
7. No body text is rendered (key `gradeBook.emptyState` is a short self-contained title; no separate body key exists).
8. Screen reader announces the container via `aria-live="polite"`.

**Alternative Flows:**
- A1 — `vm.gradeBook` is non-null (has grade data): the grade table renders; empty state is not shown.
- A2 — User changes class/subject selection: component transitions to loading state; empty state is hidden while new fetch is pending.

**Exception Flows:**
- E1 — Fetch fails: existing error banner renders; empty state is not shown.
- E2 — Fetch is pending: `GradeBookSkeleton` renders; empty state is not shown.

**Business Rules:**
- BR-01: The condition for this empty state is `vm.gradeBook === null` AND `hasSelection === true`. When `hasSelection === false`, the no-selection prompt (UC-02) renders instead.
- BR-02: No CTA is permitted (`hasCTA: false` per design-spec `emptyStates.gradebook.gradeTable`).
- BR-03: The i18n translation call is `useTranslations("gradeBook")` with key `"emptyState"` — NOT `useTranslations("grades")` or `useTranslations("grades.gradeBook")`.
- BR-04: Title element is `<p>`, not a heading, to avoid heading hierarchy disruption.

**Non-functional Constraints:**
- WCAG 2.1 AA: `role="status"` + `aria-live="polite"`; icon `aria-hidden="true"`; title contrast 9.4:1 (PASS). No body text, so muted-color advisory is moot.
- No body text means no `var(--edu-text-secondary)` requirement for this UC.

---

### UC-02: "No Selection" Prompt (Unchanged)

**Goal:** Preserve the existing no-selection prompt exactly as-is; this story does not modify it.
**Primary Actor:** Teacher, Principal, Admin, Student, Parent
**Preconditions:**
- User has not selected a class/subject (`hasSelection === false`).

**Main Success Scenario:**
1. User opens the grade book screen without selecting a class/subject.
2. The existing no-selection prompt renders unchanged (plain text, current styling).
3. The canonical empty state container with `role="status"` is NOT rendered.

**Alternative Flows:** none in scope.
**Exception Flows:** none in scope.

**Business Rules:**
- BR-01: This state is driven by `hasSelection === false` and is explicitly out of scope for the canonical empty state pattern.

---

### UC-03: Grade Table Mobile Scroll — Scroll Wrapper and Table Min-Width

**Goal:** Ensure the `GradeBookTable` scroll wrapper supports iOS momentum scrolling and that the table does not collapse below a readable column width on narrow viewports.
**Primary Actor:** Student, Parent (primary mobile users); all five roles benefit.
**Secondary Actors:** none
**Preconditions:**
- The grade book fetch has returned non-null grade data (`vm.gradeBook !== null`).
- The `GradeBookTable` shared component is rendering.
- Device is a touch-capable mobile viewport (375px or similar).

**Main Success Scenario:**
1. Grade data renders in `GradeBookTable`.
2. The scroll wrapper element has `-webkit-overflow-scrolling: touch` applied (Tailwind utility `[overflow-scrolling:touch]` or equivalent style).
3. The `<table>` element has `min-width: 640px` so columns do not collapse below readable width at 375px.
4. The user swipes horizontally; momentum scrolling continues after finger lift on iOS.
5. The sticky first column (`<th>` and `<td>` with `sticky left-0`) remains visually separated from scrolled content via `border-right: 1px solid var(--edu-border)`.

**Alternative Flows:**
- A1 — Desktop viewport (≥1024px): table fits without horizontal scroll; `-webkit-overflow-scrolling` is inert but harmless.

**Exception Flows:** none specific to this UC.

**Business Rules:**
- BR-01: `-webkit-overflow-scrolling: touch` must be on the scroll wrapper, not the table itself.
- BR-02: `min-width: 640px` must be on the `<table>` element.
- BR-03: `border-right` uses `var(--edu-border)` token, not a raw color.
- BR-04: The sticky first column background must be `var(--edu-card)` so it does not visually bleed text from scrolled columns.

**Non-functional Constraints:**
- Responsive: no horizontal overflow of the scroll wrapper itself at any viewport; scroll is internal to the wrapper.

---

### UC-04: Mobile Scroll Correctness — All Five Roles

**Goal:** Confirm that the mobile scroll fix (UC-03) is applied uniformly across all roles that share the `GradeBookTable` component; no role-specific regression.
**Primary Actor:** Student, Parent (primary mobile), Teacher, Principal, Admin (secondary)
**Preconditions:** Each role's grade book screen is rendering non-null grade data.

**Main Success Scenario:**
1. Student on `/student/grades` — table renders with momentum scroll and sticky column.
2. Parent on `/parent/grades` — same behavior; child switcher does not interfere with table scroll.
3. Teacher, Principal, Admin on their respective grade-book routes — scroll behavior present but primarily a desktop context; no regression.

**Alternative Flows:** none.
**Exception Flows:** none.

**Business Rules:**
- BR-01: `GradeBookTable` is a shared component; the fix is applied once and benefits all roles. No role-specific style overrides are permitted for this change.

---

### UC-05: Loading Skeleton (Unchanged)

**Goal:** Confirm the `GradeBookSkeleton` loading state is unaffected by this story's changes.
**Primary Actor:** Any authenticated role.
**Preconditions:** Grade book data fetch is pending.

**Main Success Scenario:**
1. Grade book fetch is in progress.
2. `GradeBookSkeleton` renders unchanged.
3. Neither the canonical empty state nor the grade table is visible.

**Alternative Flows:** none.
**Exception Flows:** none.
**Business Rules:** BR-01: This state is explicitly unchanged by this story; any regression is a defect.

---

### UC-06: Error State (Unchanged)

**Goal:** Confirm the error banner is unaffected by this story's changes.
**Primary Actor:** Any authenticated role.
**Preconditions:** Grade book data fetch has failed (network error / non-2xx).

**Main Success Scenario:**
1. Fetch fails.
2. Existing error banner renders unchanged.
3. Neither the canonical empty state nor the skeleton is visible.

**Alternative Flows:** none.
**Exception Flows:** none.
**Business Rules:** BR-01: This state is explicitly unchanged by this story; any regression is a defect.

---

## 4. Acceptance Criteria

### UC-01: Grade Book "No Grades" Empty State

**AC-01.1 (Container — role and live region):** Given `vm.gradeBook === null` and `hasSelection === true` after a successful fetch, when the grade-book-screen renders, then the empty state container has both `role="status"` and `aria-live="polite"`.

**AC-01.2 (Container — layout):** Given the above, when the component renders, then the container has `padding: 40px 20px`, `text-align: center`, and flexbox column alignment centered on both axes.

**AC-01.3 (Icon):** Given the empty state is rendered, when the DOM is inspected, then a `FileText` icon element is present with `aria-hidden="true"`, 64px size, and color `var(--edu-text-muted)`.

**AC-01.4 (Title — text and style):** Given the empty state is rendered, when the DOM is inspected, then a `<p>` element contains the text resolved from `gradeBook.emptyState` ("Chưa có điểm"), has `font-size: 16px`, `font-weight: 700`, and color `var(--edu-text-primary)`.

**AC-01.5 (Title — no heading element):** Given the empty state is rendered, when the DOM is inspected, then no `<h2>` or `<h3>` is present inside the empty state container.

**AC-01.6 (No body text):** Given the empty state is rendered, when the DOM is inspected, then no secondary body text element is present (the title is self-contained).

**AC-01.7 (No CTA):** Given the empty state is rendered, when the DOM is inspected, then no `<button>` or `<a>` element exists inside the empty state container.

**AC-01.8 (Legacy component removed):** Given the empty state is rendered, when the DOM is inspected, then no element with a dashed border or the legacy `EmptyState` component's distinct class is present.

**AC-01.9 (i18n namespace correctness):** Given the grade-book screen is server-rendered or client-translated, when the title is rendered, then the translation was obtained from namespace `"gradeBook"` (not `"grades"` or `"grades.gradeBook"`), key `"emptyState"`.

**AC-01.10 (Loading — skeleton shown, not empty state):** Given the grade book fetch is pending, when the component renders, then `GradeBookSkeleton` is shown and the `role="status"` container is not present in the DOM.

**AC-01.11 (Error — error state shown, not empty state):** Given the grade book fetch has failed, when the component renders, then the error banner is shown and the `role="status"` container is not present in the DOM.

**AC-01.12 (Populated — table shown, not empty state):** Given the grade book fetch returns non-null grade data, when the component renders, then the grade table is shown and the `role="status"` container is not present in the DOM.

**AC-01.13 (Role — all five roles):** Given any of Teacher, Principal, Admin, Student, or Parent is authenticated and their respective grade book screen shows `vm.gradeBook === null`, when the component renders, then the same canonical empty state (FileText + `gradeBook.emptyState` title) is shown with no role-specific variation.

---

### UC-02: "No Selection" Prompt Unchanged

**AC-02.1 (No canonical empty state when hasSelection is false):** Given `hasSelection === false`, when the grade-book-screen renders, then the `role="status"` canonical empty state container is not present and the existing no-selection prompt element is present.

**AC-02.2 (No regression):** Given `hasSelection === false` and the existing no-selection prompt is rendered, when the DOM is inspected, then its text content and styling are unchanged from the pre-story implementation.

---

### UC-03: Grade Table Mobile Scroll

**AC-03.1 (Momentum scroll — wrapper):** Given `GradeBookTable` is rendering grade data, when the scroll wrapper element is inspected, then it has `-webkit-overflow-scrolling: touch` applied (either via Tailwind `[overflow-scrolling:touch]` or inline `style`).

**AC-03.2 (Table min-width):** Given `GradeBookTable` is rendering, when the `<table>` element is inspected, then it has a computed `min-width` of 640px.

**AC-03.3 (Sticky column border):** Given `GradeBookTable` is rendering, when the sticky first-column `<th>` and `<td>` elements are inspected, then each has `border-right: 1px solid var(--edu-border)`.

**AC-03.4 (Sticky column background):** Given the grade table is rendering on a 375px viewport, when the user scrolls horizontally, then the sticky first-column cells have a background of `var(--edu-card)` and no text from scrolled columns bleeds visually behind them.

**AC-03.5 (No horizontal overflow of wrapper):** Given the grade table renders at 375px viewport width, when the DOM is inspected, then the scroll wrapper does not create horizontal overflow on the page; horizontal scroll is contained within the wrapper.

**AC-03.6 (MobileScroll story exists):** Given the `grade-book-table.stories.tsx` file, when all stories are listed, then a story named `MobileScroll` is present and renders the table in a 375px-wide container.

---

### UC-04: Mobile Scroll — Role Parity

**AC-04.1 (Student — scroll present):** Given a Student is viewing `/student/grades` with non-null grade data, when the `GradeBookTable` renders, then the scroll wrapper has `-webkit-overflow-scrolling: touch` and the table has `min-width: 640px`.

**AC-04.2 (Parent — scroll present, child switcher does not affect table):** Given a Parent is viewing `/parent/grades` and the child switcher is used to switch children, when the new child's grade data loads and the table renders, then the scroll wrapper still has `-webkit-overflow-scrolling: touch` and the sticky column retains its `border-right`.

**AC-04.3 (Teacher/Principal/Admin — no regression):** Given a desktop role (Teacher, Principal, Admin) views the grade book with non-null data, when the grade table renders, then the `min-width` and border-right rules are present and do not cause layout breakage at 1280px.

---

### UC-05: Loading Skeleton Unchanged

**AC-05.1 (Skeleton renders during fetch):** Given the grade book fetch is pending, when the component renders, then `GradeBookSkeleton` is present in the DOM and neither the canonical empty state container nor the grade table is present.

---

### UC-06: Error State Unchanged

**AC-06.1 (Error banner renders on failure):** Given the grade book fetch has failed, when the component renders, then the error banner is present in the DOM and neither the canonical empty state container nor the skeleton is present.

---

## 5. Edge Case Matrix

| Scenario | Empty state (`gradeBook === null`, `hasSelection = true`) | No-selection (`hasSelection = false`) | Loading | Error | Mobile scroll (all roles) |
|---|---|---|---|---|---|
| Normal flow | Canonical empty state (FileText, `gradeBook.emptyState`, no CTA) | Existing no-selection prompt (unchanged) | Skeleton only | Error banner only | `-webkit-overflow-scrolling`, `min-width: 640px`, sticky border |
| `gradeBook` is non-null | Grade table shows | — | — | — | Grade table with scroll fix |
| Auth expired during fetch | Redirect to login (existing auth flow) | Same | Same | Same | N/A |
| Network error | Error banner | Same | Same | Error banner | N/A |
| Selection changes (new fetch triggered) | Loading skeleton replaces empty state | — | Skeleton | — | N/A |
| Parent child switch | Loading → empty or populated for new child | — | Loading | — | Scroll reset to start |
| 375px viewport (Student/Parent) | Title fits within 320px max-width, no overflow | Same | Same | Same | Horizontal scroll contained in wrapper |
| 320px viewport (min) | No horizontal overflow | Same | Same | Same | Same |
| Wrong i18n namespace (`grades.gradeBook`) | Build error (TypeScript key mismatch) | N/A | N/A | N/A | N/A |
| CTA accidentally added | Defect — design-spec `hasCTA: false` | N/A | N/A | N/A | N/A |

---

## 6. Open Questions

[OPEN QUESTION OQ-01] The `GradeBookTable` stories file (`grade-book-table.stories.tsx`) — does a `MobileScroll` story already exist from US-E17.2? If so, this story should update it rather than create a duplicate. The FE team must verify before authoring the story.

[OPEN QUESTION OQ-02] The requirements note `aria-live="polite"` in TR-001, but the base `emptyStatePattern` in `design-spec.jsonc` does not list it. Given that grade selection can change dynamically, `aria-live="polite"` is an additive a11y improvement. Is this confirmed as required for this specific screen, or should it follow the base pattern (`role="status"` only)?

[OPEN QUESTION OQ-03] For the Parent role on `/parent/grades` with a child switcher: when the parent switches children and the new child has `gradeBook === null`, should the empty state title reflect the child's name (e.g., "Chưa có điểm cho [child name]") or remain generic ("Chưa có điểm")? The current i18n key is not parameterized; if personalization is needed, a new key and BA review would be required.
