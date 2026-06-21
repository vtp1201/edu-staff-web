# Requirements — US-E17.5 Empty State — Grade Book Table

## Requirements Summary

The grade book table currently renders a bare text message in a dashed-border box when no grades are present (`GradeBookScreen` internal `EmptyState` component). This must be upgraded to the canonical `emptyStatePattern` from `docs/product/design-spec.jsonc` using the existing key `gradeBook.emptyState`. Additionally, the `GradeBookTable` shared component is missing `-webkit-overflow-scrolling: touch`, a `min-width: 640px` on the `<table>`, and a `border-right` on the sticky column — mobile scroll completions from the US-E17.2 spec are included here for the shared component. No new tokens, no new i18n keys, no BE changes.

## Actors & Roles

| Role | Screen | Primary device |
|---|---|---|
| Teacher | `/teacher/grade-book` | Desktop |
| Principal | `/principal/grade-book` | Desktop |
| Student | `/student/grades` | Mobile-first |
| Parent | `/parent/grades` | Mobile-first |
| Admin | `/admin/grade-book` | Desktop |

Student and Parent are the primary mobile users. The sticky-column fix benefits them most.

## Functional Requirements

**TR-001** — Grade table empty state (canonical pattern)
When `vm.gradeBook === null` after a successful (non-error) data fetch, the system SHALL render the canonical empty state in place of the `EmptyState` component currently used:
- Container: `role="status"`, `aria-live="polite"`, centered column, padding 40px 20px
- Icon: `FileText` 64px, color `var(--edu-text-muted)`, `aria-hidden="true"`
- Title: i18n key `gradeBook.emptyState` ("Chưa có điểm"), 16px/700, `var(--edu-text-primary)`
- Body: omitted (the existing key is a short one-liner; no separate body key exists)
- CTA: none (`hasCTA: false` per design-spec `emptyStates.gradebook.gradeTable`)

Note: design-spec.jsonc references `grades.gradeBook.emptyState` but the actual i18n namespace is `gradeBook.emptyState` (verified in `vi.json`). FE team must use `useTranslations("gradeBook")` with key `emptyState`.

**TR-002** — "No selection" state unchanged
When no class/subject is selected (`!hasSelection`), the current plain-text prompt SHALL remain as-is. This story only canonicalises the no-data state, not the no-selection state.

**TR-003** — Grade table mobile scroll completion
The `GradeBookTable` wrapper at `src/components/shared/grade-book-table/grade-book-table.tsx` SHALL be updated with:
- `-webkit-overflow-scrolling: touch` on the scroll wrapper (Tailwind utility or inline style)
- `min-width: 640px` on the `<table>` element to ensure columns do not collapse below readable width on 375px
- `border-right: 1px solid var(--edu-border)` on the sticky first column `<th>` and `<td>` elements

**TR-004** — Loading and error states unchanged
Loading skeleton (`GradeBookSkeleton`) and error banner states SHALL remain exactly as implemented.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA)**
- `role="status"` + `aria-live="polite"` on the empty state container.
- Icon `aria-hidden="true"`.
- Title `var(--edu-text-primary)` = 9.4:1 contrast on white. PASS.
- Body: omitted in this case, so the muted-text advisory does not apply.
- Sticky column: `background: var(--edu-card)` ensures text on the sticky cell does not visually bleed over scrolled content.

**TR-NFR-002 — Touch**
The scroll wrapper for the grade table SHALL support smooth momentum scrolling on iOS via `-webkit-overflow-scrolling: touch`.

**TR-NFR-003 — i18n**
No new keys. Uses existing `gradeBook.emptyState`. Note: the `noSelection` key maps to a separate message and is out of scope.

**TR-NFR-004 — No token additions**
All colors from existing tokens. No `tokens.css` additions needed.

## Scope Boundary

**IN scope:**
- `src/features/grades/presentation/grade-book-screen/grade-book-screen.tsx` — swap local `EmptyState` with canonical pattern
- `src/components/shared/grade-book-table/grade-book-table.tsx` — mobile scroll completions (TR-003)
- `src/components/shared/grade-book-table/grade-book-table.stories.tsx` — add `MobileScroll` story

**OUT of scope:**
- Responsive stat-grid fix on dashboards (US-E17.1)
- Grade entry or approval screens (different story)
- Grade publishing logic changes

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001 | Canonical empty state is required for consistency and a11y |
| Must | TR-003 | Missing `-webkit-overflow-scrolling` breaks iOS momentum scroll; missing min-width causes column crush |
| Must | TR-NFR-001 | WCAG AA is a "done" criterion |
| Should | TR-NFR-002 | iOS touch scroll quality |
| Should | TR-002 | Explicit out-of-scope preservation avoids regression |
| Won't | CTA on grade book empty state | Design-spec explicitly marks `hasCTA: false` |

## Design Spec Reference

`docs/product/design-spec.jsonc` keys:
- `responsiveGrid.gradeTable` — `overflowX: auto`, `WebkitOverflowScrolling: touch`, sticky first column, `minWidth: 640px`
- `emptyStatePattern` — canonical layout
- `emptyStates.gradebook.gradeTable` — file-text icon, no CTA
