# Feature Spec — Loading Skeletons Coverage (US-E17.10)

**Status:** Draft
**Lane:** normal
**Priority:** P2
**Sources:** requirements.md + use-cases.md (this packet) · DR-011 §UX-05 · design-spec.jsonc#interactionPatterns.loadingSkeleton · E17-ux-polish epic

---

## 1. Scope & Objectives

**Purpose:** Add `StatCardSkeleton` loading states to discipline dashboard, teacher dashboard, and student dashboard, and add `TableRowSkeleton` loading state to the discipline-conduct table body. The existing feature-local skeletons (grade-entry, grade-approval, grade-book, exam-bank) are not changed.

**In scope:**
- `StatCardSkeleton` shape for: discipline-screen.tsx stat-card grid, teacher dashboard stat-card grid, student dashboard stat-card grid
- `TableRowSkeleton` shape for: discipline-conduct table body
- `motion-safe:animate-pulse` gate on all new skeleton instances
- `role="status"` + `aria-busy="true"` + sr-only text on all skeleton wrappers
- Storybook stories for each new skeleton (loading state + data state)
- Placement decision: shared if StatCardSkeleton shape is identical across all three dashboards; feature-local if shapes differ

**Out of scope:**
- Grade-entry, grade-approval, grade-book, exam-bank skeletons (already exist)
- Lesson-bank skeleton (no confirmed screen exists yet)
- Error state handling (parent responsibility)
- Skeletons for non-async/static content

**Definitions:**
- *StatCardSkeleton:* A placeholder matching the StatCard layout (icon box 52×52px, value block, label block)
- *TableRowSkeleton:* A row-shaped placeholder matching the discipline-conduct table row height and cell widths
- *CLS (Cumulative Layout Shift):* The skeleton and real content must occupy the same layout footprint so there is no visible shift when data arrives

---

## 2. Actors & Roles

| Actor | Role | Screen |
|---|---|---|
| Teacher | Internal | Teacher dashboard stat-cards; discipline-conduct table |
| Principal | Internal | Discipline screen stat-cards; teacher dashboard stat-cards |
| Student | Internal | Student dashboard stat-cards |
| Admin | Internal | Discipline-conduct table |
| Screen reader user | Assistive technology | `role="status" aria-busy="true"` + sr-only text on all wrappers |

---

## 3. Functional Requirements

### FR-001 — StatCardSkeleton on Discipline Dashboard
**Priority:** Must
**Source:** TR-E17.10-FR-001 / UC-E17.10-001

The system SHALL render a `StatCardSkeleton` in place of each `StatCard` on the discipline dashboard while `isLoading=true`. Skeleton shape: icon box 52×52px (`bg-muted`, radius 12px), value block `h-7 w-16 bg-muted`, label block `h-3 w-20 bg-muted`, card padding 20px, card radius 12px.

**AC:**
- Given discipline dashboard `isLoading=true`, Then 3 `StatCardSkeleton` components shown in stat-card grid matching the exact shape spec.
- Given `isLoading` transitions to `false`, Then `StatCardSkeleton` components are unmounted; real `StatCard` renders with no visible layout shift.

---

### FR-002 — StatCardSkeleton on Teacher Dashboard
**Priority:** Must
**Source:** TR-E17.10-FR-002 / UC-E17.10-002

The system SHALL render `StatCardSkeleton` on the teacher dashboard while `isLoading=true`, using the same 52×52px shape as FR-001.

**AC:**
- Given teacher dashboard `isLoading=true`, Then `StatCardSkeleton` components are shown using the FR-001 spec shape.
- Given data resolves, Then skeletons unmount; real cards render without layout shift.

---

### FR-003 — StatCardSkeleton on Student Dashboard
**Priority:** Must
**Source:** TR-E17.10-FR-003 / UC-E17.10-003

The system SHALL render `StatCardSkeleton` on the student dashboard while `isLoading=true`.

**AC:**
- Given student dashboard `isLoading=true`, Then `StatCardSkeleton` components are shown.
- **[OPEN QUESTION — OQ-E17.10-01]** If the student-dashboard stat-card uses a different layout than the 52×52px icon box spec, a feature-local `StudentStatCardSkeleton` is used instead. FE must verify at implementation and document the decision.

---

### FR-004 — TableRowSkeleton on Discipline-Conduct Table
**Priority:** Must
**Source:** TR-E17.10-FR-004 / UC-E17.10-004

The system SHALL render `TableRowSkeleton` rows in place of discipline-conduct table body rows while `isLoading=true`. Each skeleton row: `min-h-[44px]`, `border-b border-border`, Skeleton cell blocks of varying widths (`w-24`, `w-16`, `w-32`) with `bg-muted` per cell.

**AC:**
- Given discipline-conduct table `isLoading=true`, Then skeleton rows shown with `min-height: 44px`, `border-bottom`, and varying-width cell blocks.
- Given data resolves, Then skeleton rows unmounted; real violation rows render without layout shift.

---

### FR-005 — Accessibility Wrapper: role=status + aria-busy
**Priority:** Must
**Source:** TR-E17.10-FR-005 / UC-E17.10-001–004

The system SHALL wrap all skeleton loading containers with `role="status"` and `aria-busy="true"`. A visually hidden `<span className="sr-only">` SHALL contain `t('Common.skeleton.loadingAriaLabel')`.

**AC:**
- Given any skeleton container renders, Then wrapper has `role="status"` and `aria-busy="true"`.
- Given skeleton is unmounted (data resolved), Then `role="status"` is removed from the DOM (not merely hidden).
- Given sr-only span, Then text is sourced from `t('Common.skeleton.loadingAriaLabel')` (no hardcoded string).

---

### FR-006 — Motion-Safe Animation Gate
**Priority:** Must
**Source:** TR-E17.10-FR-006 / UC-E17.10-001

The system SHALL gate skeleton pulse animation behind `motion-safe:animate-pulse`. When `prefers-reduced-motion: reduce` is set, skeleton blocks are visible as static `bg-muted` shapes without animation.

**AC:**
- Given `prefers-reduced-motion: no-preference`, Then skeleton blocks animate with `animate-pulse`.
- Given `prefers-reduced-motion: reduce`, Then zero animation frames fired; blocks visible as static `bg-muted`.

---

### FR-007 — Shared vs Feature-Local Placement Decision
**Priority:** Should
**Source:** TR-E17.10-FR-007

The system SHALL keep skeleton files feature-local unless two features share an identical shape. If `StatCardSkeleton` shape is identical across discipline, teacher, and student dashboards, FE SHALL create `src/components/shared/stat-card-skeleton/`. If shapes differ, three feature-local files are acceptable.

**AC:**
- Given all three StatCardSkeleton shapes are identical, Then a single `src/components/shared/stat-card-skeleton/` is created per component-organization.md.
- Given `TableRowSkeleton` is used only in discipline, Then it stays feature-local in `src/features/discipline/presentation/`.

---

### FR-008 — Skeleton Visible Within 320ms
**Priority:** Must
**Source:** TR-E17.10-FR-008 / UC-E17.10-005

The system SHALL ensure skeletons are visible within 320ms of the async fetch trigger. Loading state must be set synchronously before the async call.

**AC:**
- Given user navigates to an affected screen, Then skeleton visible within 320ms of fetch trigger with no blank white area.

---

## 4. Non-Functional Requirements

### NFR-001 — Accessibility: WCAG 4.1.3 Status Messages
**Source:** TR-E17.10-NFR-001
`role="status" aria-busy="true"` on all wrappers. `sr-only` text from `t('Common.skeleton.loadingAriaLabel')`. Skeleton is unmounted (not hidden) when data loads.
**Measurable target:** Screen reader announces loading state without receiving focus; verified by `fe-accessibility-auditor`.

### NFR-002 — Performance: ≤320ms + Zero CLS
**Source:** TR-E17.10-NFR-002
Loading state set synchronously before fetch Promise; skeleton replaces content with zero layout shift.
**Measurable target:** Skeleton visible ≤320ms; CLS = 0 at all breakpoints.

### NFR-003 — Responsive: Shape Match at All Breakpoints
**Source:** TR-E17.10-NFR-003
Skeleton shapes must match real content layout at 375/768/1280px (same column count, gap).
**Measurable target:** No layout shift at 375/768/1280px transition; verified in Storybook.

### NFR-004 — Motion-Safe Animation
**Source:** TR-E17.10-NFR-004
`animate-pulse` gated by `motion-safe:`.
**Measurable target:** Zero animation frames in browser with `prefers-reduced-motion: reduce`.

### NFR-005 — i18n: No Hardcoded Loading Text
**Source:** TR-E17.10-NFR-005
sr-only text must use `t('Common.skeleton.loadingAriaLabel')`.
**Measurable target:** `bunx tsc --noEmit` passes; key exists in both vi.json and en.json.

---

## 5. UI States & Flows

| State | Trigger | Visual |
|---|---|---|
| `loading` | `isLoading=true` | Skeleton blocks visible; `role="status" aria-busy="true"` |
| `success` | `isLoading=false` | Skeletons unmounted; real content renders |
| `error` | Parent transitions to error state | Skeleton replaced by parent-managed error UI (skeleton never self-times-out) |

**Key flow — StatCardSkeleton:**
1. User navigates to discipline dashboard → fetch initiated → `isLoading=true` → 3 `StatCardSkeleton` render
2. Data resolves → `isLoading=false` → skeletons unmounted → real `StatCard` renders in same grid positions

---

## 6. Data & Integration

No backend integration. Skeletons bind to existing TanStack Query `isLoading` flags in each dashboard screen. No new data sources.

**External dependencies:**
- `src/components/ui/skeleton/` — shadcn Skeleton primitive (already exists; must use `bg-muted`, not raw color)
- `Common.skeleton.loading` i18n key (confirmed present)
- `Common.skeleton.loadingAriaLabel` i18n key (confirmed present)

---

## 7. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|---|---|---|---|
| UC-E17.10-001 | StatCardSkeleton on Discipline Dashboard | FR-001, FR-005, FR-006 | AC-01, AC-04, AC-05, AC-08–14 |
| UC-E17.10-002 | StatCardSkeleton on Teacher Dashboard | FR-002, FR-005, FR-006 | AC-02, AC-04, AC-05 |
| UC-E17.10-003 | StatCardSkeleton on Student Dashboard | FR-003, FR-005, FR-006 | AC-03, AC-04, AC-05 |
| UC-E17.10-004 | TableRowSkeleton on Discipline-Conduct Table | FR-004, FR-005, FR-006 | AC-06, AC-07 |
| UC-E17.10-005 | Skeleton Visible Within 320ms | FR-008 | AC-13 |

---

## 8. Constraints & Assumptions

**Technical constraints:**
- The shadcn Skeleton primitive must use `bg-muted` (semantic token). If it uses a raw color, FE must correct it before use.
- Skeleton and real content MUST occupy the same layout footprint (same CSS grid column count, same card height) to achieve CLS = 0.

**Confirmed assumptions:**
- [ASSUMPTION] Teacher dashboard, student dashboard, and discipline dashboard all expose an `isLoading` boolean from their TanStack Query hooks that the skeleton can bind to.
- [ASSUMPTION] StatCard shape is identical (or nearly identical) across discipline, teacher, and student dashboards, making a shared `StatCardSkeleton` viable. If shapes differ materially, three feature-local files per FR-007.

**[OPEN QUESTION] OQ-E17.10-01:** Does the student-dashboard stat-card grid use the same 52×52px icon box layout as discipline/teacher dashboards? **Recommended default:** FE verifies at implementation. If identical → shared component in `src/components/shared/stat-card-skeleton/`. If different → feature-local `StudentStatCardSkeleton`. Decision must be documented in the implementation commit.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-001 (Discipline StatCardSkeleton) | TR-E17.10-FR-001 + design-spec.jsonc#loadingSkeleton.shapes.StatCardSkeleton | UC-E17.10-001 | None | Must |
| FR-002 (Teacher StatCardSkeleton) | TR-E17.10-FR-002 | UC-E17.10-002 | None | Must |
| FR-003 (Student StatCardSkeleton) | TR-E17.10-FR-003 | UC-E17.10-003 | None | Must |
| FR-004 (TableRowSkeleton) | TR-E17.10-FR-004 + design-spec.jsonc#loadingSkeleton.shapes.TableRowSkeleton | UC-E17.10-004 | None | Must |
| FR-005 (role=status + aria-busy) | TR-E17.10-FR-005 + design-spec.jsonc#loadingSkeleton.wrapper | All UCs | i18n: `Common.skeleton.loadingAriaLabel` | Must |
| FR-006 (motion-safe gate) | TR-E17.10-FR-006 + design-spec.jsonc#loadingSkeleton.motionGate | All UCs | None | Must |
| FR-007 (Placement decision) | TR-E17.10-FR-007 | All UCs | None | Should |
| FR-008 (≤320ms visible) | TR-E17.10-FR-008 | UC-E17.10-005 | None | Must |
| NFR-001 (WCAG 4.1.3) | TR-E17.10-NFR-001 | All UCs (AC-08, AC-09, AC-10) | None | Must |
| NFR-002 (≤320ms + CLS=0) | TR-E17.10-NFR-002 | UC-E17.10-005 (AC-13) | None | Must |
| NFR-003 (Responsive shape match) | TR-E17.10-NFR-003 | All UCs (AC-05) | None | Must |
| NFR-004 (motion-safe) | TR-E17.10-NFR-004 | All UCs (AC-11, AC-12) | None | Must |
| NFR-005 (No hardcoded strings) | TR-E17.10-NFR-005 | All UCs (AC-10) | i18n: `Common.skeleton.loadingAriaLabel` | Must |

### i18n Key Coverage

| i18n Key Path | vi Value | en Value | Status | Used in |
|---|---|---|---|---|
| `Common.skeleton.loading` | (loading text) | "Loading..." | Existing (confirmed) | FR-005 alternate usage |
| `Common.skeleton.loadingAriaLabel` | "Đang tải..." | "Loading..." | Existing (confirmed) | FR-005 sr-only text (AC-10) |

**No net-new i18n keys required for US-E17.10.**

---

## 10. Handoff to FE

**What `fe-lead` should build:**

1. **StatCardSkeleton** for discipline dashboard, teacher dashboard, student dashboard — verify if identical shape for all three before deciding shared vs feature-local placement.
2. **TableRowSkeleton** for discipline-conduct table — feature-local in `src/features/discipline/presentation/`.
3. **A11y wrappers** on all new skeletons: `role="status" aria-busy="true"` + `<span className="sr-only">{t('Common.skeleton.loadingAriaLabel')}</span>`.
4. **motion-safe gate** on all `animate-pulse` classes: `motion-safe:animate-pulse`.
5. **Storybook proof:** loading story (skeleton) + data story (real content) + aria-busy assertion for each screen.

**Lane:** normal

**Proof owed (TEST_MATRIX rows):**

| Layer | Expected proof |
|---|---|
| Unit | Vitest: shape rendering — icon box, value/label blocks present with correct Tailwind classes; `motion-safe:animate-pulse` class present |
| Integration | None |
| E2E | Storybook: skeleton→data transition at 375/768/1280px; `aria-busy` present during loading, absent after data; no layout shift |
| Platform | Manual `prefers-reduced-motion: reduce` check (static bg-muted elements) |
