# US-E17.10 — Loading Skeletons Coverage: Use Cases & Acceptance Criteria

**Story ID:** US-E17.10
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**UC Author:** ba-use-case-modeler

---

## 1. Use Case Scope Summary

**Total UCs:** 5
**Actors:** Teacher, Principal, Student, Admin (role variants determine which screens they see)
**System boundary:** Feature-local skeleton components for discipline dashboard, teacher dashboard, and student dashboard (StatCardSkeleton shape) and the discipline-conduct table body (TableRowSkeleton shape). The shadcn Skeleton primitive (`src/components/ui/skeleton/`) is the base. No BE integration — skeletons bind to existing TanStack Query `isLoading` flags.

**Out of scope:** grade-entry, grade-approval, grade-book, exam-bank (already have skeletons). Error states are managed by parent components, not skeletons.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in Scope |
|---|---|---|
| Teacher | Human, internal | Sees StatCardSkeleton on teacher dashboard and discipline screen; TableRowSkeleton on discipline-conduct table |
| Principal | Human, internal | Sees StatCardSkeleton on discipline screen and teacher dashboard |
| Student | Human, internal | Sees StatCardSkeleton on student dashboard |
| Admin | Human, internal | Sees TableRowSkeleton on discipline screen violations table |
| Screen reader user | Assistive technology | Receives `role="status" aria-busy="true"` + sr-only text announcing loading state |

---

## 3. Use Case Catalogue

### UC-E17.10-001 — StatCardSkeleton on Discipline Dashboard

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. User navigates to the discipline dashboard.
2. Discipline dashboard data fetch is initiated but not yet resolved (`isLoading=true`).

**Main Success Scenario:**
1. Parent renders `StatCardSkeleton` in place of each real `StatCard` in the stat-card grid.
2. Each skeleton renders: icon box 52×52px (`bg-muted`, radius 12px), value block `h-7 w-16 bg-muted`, label block `h-3 w-20 bg-muted`, card padding 20px, card radius 12px.
3. Skeleton wrapper has `role="status"` and `aria-busy="true"`.
4. An sr-only `<span>` contains `t('Common.skeleton.loadingAriaLabel')` text.
5. Skeleton blocks animate via `motion-safe:animate-pulse`.
6. When data resolves (`isLoading=false`), skeleton is unmounted and real `StatCard` components render with no visible layout shift.

**Alternative Flows:**
- A1 (User with prefers-reduced-motion: reduce): Skeleton renders with `bg-muted` shapes but no pulse animation.

**Exception Flows:**
- E1 (Loading state persists beyond timeout): Parent transitions to an error state and replaces the skeleton with an error message. Skeleton itself does not self-time-out.

---

### UC-E17.10-002 — StatCardSkeleton on Teacher Dashboard

**Primary Actor:** Teacher / Principal
**Preconditions:**
1. User is on the teacher dashboard.
2. Dashboard stat-card data fetch is in-flight.

**Main Success Scenario:**
Identical shape to UC-E17.10-001. Parent renders `StatCardSkeleton` in place of each stat card; skeleton unmounts when data resolves; no layout shift.

---

### UC-E17.10-003 — StatCardSkeleton on Student Dashboard

**Primary Actor:** Student
**Preconditions:**
1. User is on the student dashboard.
2. Dashboard stat-card data fetch is in-flight.

**Main Success Scenario:**
Identical shape to UC-E17.10-001. Parent renders `StatCardSkeleton` in place of each stat card; skeleton unmounts when data resolves; no layout shift.

**Alternative Flows:**
- A1 (Student dashboard uses different card size): If the shape differs materially from the 52×52px icon box spec, a feature-local `StudentStatCardSkeleton` is used instead of the shared `StatCardSkeleton`. The a11y and motion-safe requirements are identical.

---

### UC-E17.10-004 — TableRowSkeleton on Discipline-Conduct Table

**Primary Actor:** Teacher / Admin
**Preconditions:**
1. User is on the discipline screen or student conduct screen viewing the violations table.
2. Violation data fetch is in-flight.

**Main Success Scenario:**
1. Parent renders multiple `TableRowSkeleton` rows in place of real table rows.
2. Each skeleton row: `min-h-[44px]`, `border-b border-border`, Skeleton cell blocks of varying widths (e.g. `w-24`, `w-16`, `w-32`) with `bg-muted` per cell.
3. Wrapper has `role="status"` and `aria-busy="true"` with sr-only text.
4. Skeleton blocks animate via `motion-safe:animate-pulse`.
5. When data resolves, skeleton rows are unmounted; real rows render with no layout shift.

---

### UC-E17.10-005 — Skeleton Visible Within 320ms

**Primary Actor:** Any actor on an affected screen
**Preconditions:**
1. User navigates to a screen with a skeleton-covered section.
2. Loading state is set synchronously before the async fetch Promise is created.

**Main Success Scenario:**
1. The loading state flag is `true` in the same React render that initiates the fetch.
2. Skeleton renders within the same render cycle — visible within 320ms of the navigation or fetch trigger.
3. No blank white area is visible between navigation and skeleton appearance.

---

## 4. Acceptance Criteria

### UC-E17.10-001 / 002 / 003: StatCardSkeleton

**AC-E17.10-01 — Loading: StatCardSkeleton renders on discipline dashboard**
Given the discipline dashboard `isLoading=true` (data fetch in-flight),
When the page renders,
Then 3 `StatCardSkeleton` components are shown in the stat-card grid in place of real `StatCard` components,
And each skeleton has: an icon box placeholder 52×52px (`bg-muted`, radius 12px), a value block `h-7 w-16 bg-muted`, and a label block `h-3 w-20 bg-muted`,
And the card has padding 20px and card radius 12px.

**AC-E17.10-02 — Loading: StatCardSkeleton renders on teacher dashboard**
Given the teacher dashboard `isLoading=true`,
When the page renders,
Then `StatCardSkeleton` components are shown in place of real stat cards,
Using the same 52×52px icon box spec as AC-E17.10-01.

**AC-E17.10-03 — Loading: StatCardSkeleton renders on student dashboard**
Given the student dashboard `isLoading=true`,
When the page renders,
Then `StatCardSkeleton` components are shown in place of real stat cards.

**AC-E17.10-04 — Success: skeleton unmounts when data resolves**
Given the discipline dashboard (or teacher/student dashboard) was showing `StatCardSkeleton` (isLoading=true),
When the data fetch resolves successfully (`isLoading=false`),
Then the `StatCardSkeleton` components are unmounted from the DOM,
And the real `StatCard` components render in their place,
And there is no visible layout shift (card grid dimensions are stable during the transition).

**AC-E17.10-05 — No layout shift at any breakpoint**
Given the skeleton and the real `StatCard` occupy the same layout footprint,
When tested at 375px, 768px, and 1280px viewports,
Then no layout shift occurs when the skeleton transitions to real content (CLS = 0).

---

### UC-E17.10-004: TableRowSkeleton

**AC-E17.10-06 — Loading: TableRowSkeleton renders in discipline-conduct table**
Given the discipline-conduct table data fetch is in-flight (`isLoading=true`),
When the table body renders,
Then skeleton rows are shown in place of real table rows,
And each skeleton row has `min-height: 44px` and `border-bottom` using `border-border`,
And each row contains Skeleton cell blocks of varying widths (`w-24`, `w-16`, `w-32` or similar) with `bg-muted`.

**AC-E17.10-07 — Success: table skeleton unmounts when data resolves**
Given the table was showing skeleton rows,
When the violation data resolves,
Then skeleton rows are unmounted and real violation rows render with no layout shift.

---

### All Skeletons: Accessibility

**AC-E17.10-08 — Accessibility: role=status and aria-busy on skeleton wrapper**
Given any skeleton container (StatCardSkeleton group or TableRowSkeleton group) is rendered,
When a screen reader user navigates to the loading area,
Then the wrapper element has `role="status"` and `aria-busy="true"`,
And a visually hidden `<span>` with `class="sr-only"` contains the text resolved from `t('Common.skeleton.loadingAriaLabel')`.

**AC-E17.10-09 — Accessibility: aria-busy removed on data arrival**
Given the skeleton wrapper has `role="status" aria-busy="true"`,
When the skeleton is unmounted (data resolved),
Then the `role="status"` region is removed from the DOM (not merely hidden),
And no stale `aria-busy="true"` remains.

**AC-E17.10-10 — Accessibility: sr-only text uses i18n key**
Given any skeleton wrapper's sr-only span,
Then the text is sourced from `t('Common.skeleton.loadingAriaLabel')` (no hardcoded string),
And `bunx tsc --noEmit` passes with no missing-key errors.

---

### All Skeletons: Motion

**AC-E17.10-11 — Motion-safe: pulse only when motion is allowed**
Given a user's OS is set to `prefers-reduced-motion: no-preference`,
When a skeleton renders,
Then the Skeleton blocks animate with `animate-pulse`.

**AC-E17.10-12 — Motion-safe: no pulse when reduced-motion is set**
Given a user's OS is set to `prefers-reduced-motion: reduce`,
When a skeleton renders,
Then the Skeleton blocks are visible as static `bg-muted` shapes without any animation,
And zero animation frames are fired (the `motion-safe:animate-pulse` class is not applied).

---

### All Skeletons: Performance

**AC-E17.10-13 — Performance: skeleton visible within 320ms**
Given a user navigates to a screen with a skeleton section,
And the loading state is set synchronously before the fetch Promise is created,
When the user's browser renders the page,
Then the skeleton is visible within 320ms of the navigation trigger,
And no blank white area is shown while waiting for data.

---

### All Skeletons: Token Compliance

**AC-E17.10-14 — Design system: skeleton blocks use bg-muted token only**
Given the skeleton component source is reviewed,
Then skeleton placeholder elements use the `bg-muted` semantic token,
And no raw color values (`#`, `slate-`, `gray-`) are used.

---

### Component Placement

**AC-E17.10-15 — Placement: shared StatCardSkeleton if shapes are identical**
Given the FE team has compared `StatCardSkeleton` shapes across discipline, teacher, and student dashboards,
When all three shapes are identical (52×52px icon box, same value/label block dimensions),
Then a single `src/components/shared/stat-card-skeleton/` is created per component-organization.md,
And no duplicate shape definitions exist across feature folders.

**AC-E17.10-16 — Placement: TableRowSkeleton stays feature-local**
Given the `TableRowSkeleton` is used only in the discipline screen,
Then it resides in `src/features/discipline/presentation/` (feature-local),
And is only promoted to `components/shared/` if a second feature requires the identical shape.

---

## 5. Edge Case Matrix

| Scenario | isLoading=true | data-resolves | error-state | prefers-reduced-motion | 375px | 768px | 1280px | CLS |
|---|---|---|---|---|---|---|---|---|
| StatCardSkeleton (discipline) | 3 skeletons visible | unmounted; real cards render | parent shows error (skeleton not used) | static bg-muted, no pulse | columns match real grid | columns match real grid | columns match real grid | 0 |
| StatCardSkeleton (teacher) | skeletons visible | unmounted; real cards render | parent shows error | static bg-muted, no pulse | match real grid | match real grid | match real grid | 0 |
| StatCardSkeleton (student) | skeletons visible | unmounted; real cards render | parent shows error | static bg-muted, no pulse | match real grid | match real grid | match real grid | 0 |
| TableRowSkeleton (discipline) | rows visible, min-h-44px | unmounted; real rows render | parent shows error | static bg-muted, no pulse | rows correct | rows correct | rows correct | 0 |
| role=status/aria-busy | present | removed (unmounted) | N/A | present | present | present | present | N/A |
| sr-only text | i18n key | removed with skeleton | N/A | i18n key | i18n key | i18n key | i18n key | N/A |

---

## 6. Open Questions

**OQ-E17.10-01** [OPEN QUESTION] Does the student-dashboard stat-card use the same 52×52px icon box layout as discipline/teacher dashboards? If the student dashboard has a different card structure, three separate feature-local skeleton files are required instead of a shared `StatCardSkeleton`. FE team must verify at implementation time and document the decision.
