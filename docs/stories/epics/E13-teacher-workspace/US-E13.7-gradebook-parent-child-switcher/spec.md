# Feature Spec — Grade Book Parent Child-Switcher (US-E13.7)

**Status:** Draft
**Lane:** normal
**Date:** 2026-06-21
**Depends on:** US-E13.6 (grade book multi-role — implemented; provides `GradeBookTable`, `GetChildGradesUseCase`, `MockGradeBookRepository`)
**Blocks:** none
**Design-spec key:** `gradeBook.parent.childSwitcher` (in `docs/product/design-spec.jsonc`)
**Sources:** story.md §Acceptance Criteria, use-cases.md §UC-1–UC-7, ba-requirements-analyst TR-001..TR-009, ba-integration-analyst INT-001..INT-002, ba-use-case-modeler §4–§7, design-spec extract gradeBook.parent.childSwitcher

---

## 1. Scope & Objectives

### Purpose

US-E13.7 adds the `ChildSwitcher` component to the `/parent/grades` route so that a parent with two or more enrolled children can view each child's grade book independently. When only one child is linked to the account the switcher is absent and the screen behaves identically to US-E13.6.

### In Scope

- `ChildSwitcher` component at `features/grades/presentation/child-switcher/` (feature-local; promote to `components/shared/` deferred to a follow-up when a second screen requires it).
- `GradeBookScreenVM` extension: additive fields `childrenList` and `activeChildId` for the parent role branch only.
- `getChildList()` method added to `IGradeBookRepository`, `GradeBookRepository` (stub returns `NOT_IMPLEMENTED`), and `MockGradeBookRepository` (returns `VIEWER_CHILDREN` seed).
- `GRADES_EP.childList` endpoint constant added.
- `MockGradeBookRepository.getChildGrades` made childId-aware (dispatches on `c1` → `MOCK_GRADE_BOOK_ROWS_CHILD_0`, `c2` → `MOCK_GRADE_BOOK_ROWS_CHILD_1`).
- Four required Storybook stories; unit + integration tests.
- `gradePublishMode` gate evaluated per active child on every switch.
- Keyboard navigation: ArrowLeft/ArrowRight (focus-only), Enter/Space (activate + fetch), roving tabindex.
- `role="tablist"` / `role="tab"` / `aria-selected` / `role="tabpanel"` ARIA pattern.

### Out of Scope

- TermPicker card changes.
- Contact-teacher strip.
- Any mutation (fully read-only).
- Promoting `ChildSwitcher` to `components/shared/` (deferred).
- Live `core` service integration (mock-first per decision 0014).
- Sourcing `childrenList` beyond VM prop consumption (RSC page resolves it; this story consumes the prop).

### Definitions

| Term | Meaning |
|------|---------|
| `ChildSwitcher` | Tab-card UI allowing a parent to switch between linked children |
| `activeChildId` | The `childId` string currently selected in the switcher; drives the grade book fetch |
| `childrenList` | Array `{ childId, name, className, avatar, color }[]` from parent session / core service |
| `gradePublishMode` | `SELF_PUBLISH` or `ADMIN_APPROVAL`; evaluated per active child's grade response |
| `LockedBanner` | Warning banner rendered when `gradePublishMode === ADMIN_APPROVAL` and scores are unpublished |
| `GradeBookSkeleton` | Placeholder shown within 320ms of any async grade fetch |
| mock-first | No live backend call; `MockGradeBookRepository` returns seed data (decision 0014) |

---

## 2. Actors & Roles

| Actor | Role Type | Capabilities in this story | Gated visibility |
|-------|-----------|----------------------------|-----------------|
| `parent` | Primary human actor | Reads grade book per linked child; switches active child via ChildSwitcher; keyboard-navigates tabs | ChildSwitcher only rendered for this role |
| `teacher` | Out of scope | Accesses `/teacher/grades` — unaffected | ChildSwitcher MUST NOT appear |
| `principal` | Out of scope | Accesses `/principal/grades` — unaffected | ChildSwitcher MUST NOT appear |
| `student` | Out of scope | Accesses `/student/grades` — unaffected | ChildSwitcher MUST NOT appear |
| `admin` | Out of scope | Not on `/parent/grades` — unaffected | ChildSwitcher MUST NOT appear |
| `GetChildListUseCase` | System actor | Fetches `[{childId, name, className, avatar, color}]` for the authenticated parent via mock-first | — |
| `GetChildGradesUseCase` | System actor | Fetches `GradeBookRow[] + publishMode` for a given `(childId, term)` — already wired from US-E13.6 | — |
| `MockGradeBookRepository` | System actor | Returns `VIEWER_CHILDREN` + `VIEWER_DATA_BY_CHILD` seed; extended to be `childId`-aware | — |

**Role-gated visibility rule:** `ChildSwitcher` is exclusively instantiated within the `parent` role branch of `GradeBookScreen` / `ParentGradeBookScreen`. It is never conditionally shown or hidden for other roles — it simply does not exist in their render trees (BR-008).

---

## 3. Functional Requirements

| ID | Priority | Source | The system SHALL… | Acceptance Criteria | Dependencies |
|----|----------|--------|-------------------|---------------------|--------------|
| TR-001 | Must | story.md AC1, use-cases.md BR-001 | Hide ChildSwitcher from DOM when `childrenList.length < 2`; set `activeChildId = children[0].childId` silently; render ChildSwitcher when `childrenList.length >= 2` with default `activeChildId = children[0].childId` | AC-1.2, AC-1.3 | US-E13.6 (parent view exists) |
| TR-002 | Must | design-spec gradeBook.parent.childSwitcher | Render each tab as: Avatar (26px, `child.color`) + name (12.5px/800/`var(--edu-text-primary)`) + className (10.5px/`var(--edu-text-muted)`); section label from `gradeBook.childSwitcherLabel`; active: 1.5px solid `child.color` border + `child.color+'14'` bg; inactive: 1.5px solid `var(--edu-border)` + `var(--edu-card)` bg | AC-2.3, AC-2.4, AC-2.5 | NFR-007 (i18n key exists) |
| TR-003 | Must | story.md AC3, use-cases.md UC-3 | On tab click/activation call `GetChildGradesUseCase(childId, term)` → show `GradeBookSkeleton` during fetch → refresh `GradeBookTable` on success | AC-3.1, AC-3.2, AC-3.3 | TR-001 (switcher visible), INT-002 |
| TR-004 | Must | NFR-004 | Show `GradeBookSkeleton` within 320ms of tab activation; produce zero layout shift (CLS = 0) during the switch | AC-3.1, AC-3.6 | TR-003 |
| TR-005 | Must | use-cases.md BR-004 | Isolate each child's data fully — `child1`'s scores, GPA, rank, and `publishMode` MUST NOT bleed into `child0`'s view and vice versa; TanStack Query key `['gradeBook', 'child', childId, term]` changes on switch | AC-3.3, AC-3.4, AC-4.4 | INT-002 |
| TR-006 | Must | story.md AC4, use-cases.md UC-5 | Evaluate `gradePublishMode` gate per active child on every switch; show `LockedBanner` + masked score cells when `ADMIN_APPROVAL`; remove banner when child with `SELF_PUBLISH` is active | AC-5.1, AC-5.2, AC-5.3, AC-5.4 | TR-003 |
| TR-007 | Must | story.md §Design Notes | Expose zero mutation surfaces; all interactions are read-only | AC-7.1–AC-7.4 | — |
| TR-008 | Must | story.md AC5 | Leave all non-parent role views completely unaffected; all 739 US-E13.6 tests MUST continue to pass | AC-7.1–AC-7.4 | US-E13.6 |
| TR-009 | Should | use-cases.md UC-6, BR-009/BR-010/BR-011 | Support ArrowLeft/ArrowRight keyboard focus-only navigation (no fetch on arrow press); Enter/Space to activate + trigger fetch; roving tabindex; boundary wrap at both ends | AC-6.1–AC-6.9 | NFR-001 |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement | Measurable Target | QA Verification |
|----|----------|-------------|-------------------|-----------------|
| NFR-001 | Accessibility (ARIA) | ChildSwitcher container MUST have `role="tablist"`; each button `role="tab"` + `aria-selected`; `GradeBookTable` wrapper `role="tabpanel"` associated via `aria-controls` / `aria-labelledby`; WCAG 2.1 AA SC 4.1.2 | Zero ARIA role violations in axe-core scan | `fe-accessibility-auditor` axe-core + Storybook a11y addon |
| NFR-002 | Accessibility (interaction) | Each tab button MUST have minimum 44×44px touch target (padding inclusive); visible focus ring using `--ring` CSS token; MUST NOT set `outline: none` without visible replacement; WCAG 2.1 AA SC 2.5.5, 2.4.7 | Touch target ≥ 44×44px measured in browser devtools; focus ring contrast ≥ 3:1 vs adjacent bg | Storybook story with focus state; manual keyboard test |
| NFR-003 | Accessibility (color) | Active tab state MUST NOT rely on color alone; `aria-selected="true"` provides the non-visual signal; WCAG 2.1 AA SC 1.4.1 | axe-core passes; Storybook story checked in forced-color / grayscale | `fe-accessibility-auditor` + `/impeccable audit` |
| NFR-004 | Performance | `GradeBookSkeleton` appears within 320ms of tab click / page mount | P90 ≤ 320ms measured in Storybook interaction timeline | Storybook interaction test assertion on skeleton visibility |
| NFR-005 | Performance | Zero layout shift (CLS = 0) on child switch — ChildSwitcher card position does not change; only `GradeBookTable` area refreshes | CLS = 0 in Lighthouse run or Storybook interaction | Visual regression snapshot in Storybook |
| NFR-006 | Responsive | No horizontal scroll at 320px viewport width with any number of children | Zero `overflow-x` scroll at 320px on Chrome/Safari DevTools emulation; all tab content readable | Storybook story rendered at 320px viewport |
| NFR-007 | i18n | All visible strings served from `gradeBook` namespace; `gradeBook.childSwitcherLabel` is the only ChildSwitcher copy key; NO new i18n keys added without OQ-002 resolution | `tsc --noEmit` passes; no Vietnamese diacritics hardcoded in `.tsx` (excluding messages, `*.test.*`, `*.stories.*`) | Pre-commit `tsc --noEmit`; grep scan |
| NFR-008 | Motion / a11y | All CSS transitions on tab switch and skeleton gated behind `@media (prefers-reduced-motion: reduce)` → transitions are instant when preference is set | Computed `transition-duration: 0s` in reduced-motion media query; Storybook story in reduced-motion viewport | Storybook story `AC-3.7`; axe prefers-reduced-motion check |

---

## 5. UI States & Flows

### Required states per async surface

#### Child List Loading (getChildList in flight)
- Full page skeleton or spinner shown.
- ChildSwitcher MUST NOT render any partial structure.
- No `role="tablist"` present in DOM.

#### Child List Error
- `ErrorBanner` with message from `gradeBook.error.<failureType>`.
- Retry button when `retryable === true` (network-error, unknown); absent when `retryable === false` (forbidden, not-found).
- GradeBookTable NOT rendered.
- ChildSwitcher NOT rendered.

#### Child List Empty (0 children)
- Empty state shown — pending copy key (OQ-002; placeholder `gradeBook.noEnrolledChildren`).
- ChildSwitcher NOT rendered; GradeBookTable NOT rendered.

#### Child List Success — Single Child
- ChildSwitcher NOT rendered (no DOM presence).
- `activeChildId` set silently to `children[0].childId`.
- Grade fetch proceeds automatically → skeleton → table.

#### Child List Success — Multi Child
- ChildSwitcher card rendered.
- Default active tab: `children[0]`.
- Grade fetch for `children[0]` initiated automatically.

#### Grade Fetch Loading (after list resolves or tab switch)
- `GradeBookSkeleton` replaces or holds the `GradeBookTable` area within 320ms.
- ChildSwitcher card remains mounted and interactive throughout.
- Active tab already reflects the clicked child (optimistic visual update).

#### Grade Fetch Error
- `ErrorBanner` in the `GradeBookTable` area.
- ChildSwitcher remains visible and fully interactive.
- Active tab stays on the failed child; parent can click another tab to recover.

#### Grade Fetch Success
- `GradeBookTable` renders with active child's subjects, scores, GPA.
- If `gradePublishMode === ADMIN_APPROVAL`: `LockedBanner` above table; masked score cells.
- If `gradePublishMode === SELF_PUBLISH`: no banner; all scores visible.

### Key flow: Multi-child switch (UC-3)

```
Parent clicks tab[N]
  → activeChildId updated immediately (optimistic)
  → tab[N] aria-selected="true"; tab[prev] aria-selected="false"
  → GradeBookSkeleton shown (<= 320ms)
  → GetChildGradesUseCase(childId=childN.childId, term=selectedTerm)
      ├─ cache hit (TanStack Query key ['gradeBook','child',childId,term])
      │     → skeleton may be skipped; GradeBookTable renders immediately
      └─ cache miss
            → network request
            ├─ success → GradeBookTable renders; gradePublishMode evaluated
            └─ error   → ErrorBanner; retry button if retryable
```

### Key flow: Keyboard navigation (UC-6)

```
Tab → focus lands on active tab (tabindex=0)
ArrowRight/Left → focus moves; aria-selected unchanged; NO fetch
Enter/Space → tab activated; aria-selected updates; fetch triggered (UC-3 flow)
Tab (while inside ChildSwitcher) → focus exits to next DOM element
```

---

## 6. Data & Integration

### INT-001 — Get Parent's Child List

| Field | Value |
|-------|-------|
| Service | `core` (preferred; `iam` holds identity link, `core` holds class enrollment with `className`) |
| Status | **MOCK-FIRST** — live endpoint does not yet exist (decision 0014) |
| Method | `GET` |
| Path | `/core/api/v1/parent/children` |
| New endpoint constant | `GRADES_EP.childList = '/core/api/v1/parent/children'` |
| Auth | Bearer token (standard `Authorization: Bearer <accessToken>`) |
| New repo method | `getChildList(): Promise<ChildSummary[]>` on `IGradeBookRepository`, `GradeBookRepository` (stub → `NOT_IMPLEMENTED`), `MockGradeBookRepository` (returns `VIEWER_CHILDREN` seed) |
| TanStack Query key | `['gradeBook', 'children']` |

**Response shape (camelCase — wire format):**

```jsonc
{
  "children": [
    { "childId": "c1", "name": "Nguyễn Minh Khoa", "className": "11A2", "avatar": "NK", "color": "primary" },
    { "childId": "c2", "name": "Nguyễn Thu Hà",    "className": "8B1",  "avatar": "NH", "color": "success" }
  ]
}
```

Note: `child.color` is a design-token role string (`'primary'|'success'|'warning'|'error'|'purple'`). Presentation maps to CSS variable (e.g. `'primary'` → `var(--edu-primary)`). Fallback to `var(--edu-primary)` when absent (Assumption A2).

**Error mapping:**

| HTTP status / error.code | Failure type | Retry? | UI treatment |
|--------------------------|--------------|--------|--------------|
| 403 / `FORBIDDEN` | `forbidden` | No | ErrorBanner without retry |
| 401 / `UNAUTHORIZED` | redirect | — | Existing auth interceptor handles refresh/redirect |
| 5xx / timeout | `network-error` | Yes | ErrorBanner + retry button |
| `[]` (empty array) | `zero-child` | — | Empty state (OQ-002 for copy key) |

**OQ-001 impact:** If childrenList originates from JWT claim (option a) rather than REST, the `getChildList()` async flow simplifies to synchronous prop resolution; no TanStack Query key and no loading/error states for the child list are needed. FE defaults to mock-first async until confirmed.

---

### INT-002 — Get Child Grade Book (pre-existing, extended)

| Field | Value |
|-------|-------|
| Service | `core` |
| Status | Pre-existing from US-E13.6; extended for childId-dispatch in mock |
| Endpoint constant | `GRADES_EP.childGrades(childId)` — unchanged |
| Use case | `GetChildGradesUseCase.execute(childId, term)` — unchanged |
| TanStack Query key | `['gradeBook', 'child', childId, term]` |
| New mock behavior | `MockGradeBookRepository.getChildGrades` dispatches: `'c1'` → `MOCK_GRADE_BOOK_ROWS_CHILD_0` (Nguyễn Minh Khoa, 11A2, 6 subjects, one pending-publish row); `'c2'` → `MOCK_GRADE_BOOK_ROWS_CHILD_1` (Nguyễn Thu Hà, 8B1, 5 subjects, one pending-publish row); fallback → `MOCK_GRADE_BOOK_ROWS_CHILD_0` |

**Error mapping (unchanged from US-E13.6):**

| Failure type | Retry? | UI treatment |
|--------------|--------|--------------|
| `not-found` | No | ErrorBanner; no retry |
| `forbidden` | No | ErrorBanner; no retry; parent can switch to another child |
| `not-published` | No | LockedBanner + masked cells (gradePublishMode = ADMIN_APPROVAL) |
| `network-error` | Yes | ErrorBanner + retry button |
| `unknown` | Yes | ErrorBanner + retry button |

**Data isolation guarantee:** Each query key includes `childId`; TanStack Query cache entries are independent. A failure for `child1` does not invalidate `child0`'s cache entry.

---

## 7. Design Spec Values

All values from `docs/product/design-spec.jsonc` entry `gradeBook.parent.childSwitcher`. Use tokens only — no raw hex colors.

### ChildSwitcher card container

| Property | Value |
|----------|-------|
| Background | `var(--edu-card)` |
| Border radius | `12px` |
| Border | `1px solid var(--edu-border)` |
| Box shadow | `0 2px 12px rgba(0,0,0,0.04)` |
| Padding | `12px` |
| Flex direction | `column` |
| Gap | `6px` |
| Min width | `180px` |

### Section label (above tabs)

| Property | Value |
|----------|-------|
| Font size | `10.5px` |
| Font weight | `800` |
| Color | `var(--edu-text-muted)` |
| Letter spacing | `0.08em` |
| Text transform | `UPPERCASE` |
| i18n key | `gradeBook.childSwitcherLabel` (already in `vi.json` / `en.json` — do NOT re-add) |

### Child tab button

| Property | Value |
|----------|-------|
| Display | `flex` |
| Align items | `center` |
| Gap | `9px` |
| Padding | `7px 10px` |
| Border radius | `8px` |
| Min touch target | `44×44px` |

**Active state:**

| Property | Value |
|----------|-------|
| Border | `1.5px solid child.color` (CSS variable resolved from token role string) |
| Background | `child.color + '14'` — append hex `14` to the CSS variable value, producing ≈8% opacity tint; this follows the `/14` opacity pattern established for `bg = color/18` in StatCard and `bg = color/15` in Badge (design-system.md component patterns) |
| `aria-selected` | `"true"` |

**Inactive state:**

| Property | Value |
|----------|-------|
| Border | `1.5px solid var(--edu-border)` |
| Background | `var(--edu-card)` |
| `aria-selected` | `"false"` |

### Avatar (within each tab)

| Property | Value |
|----------|-------|
| Size | `26px` |
| Color | `child.color` (resolved from token role string) |
| Content | `child.avatar` (initials string, e.g. `"NK"`) |
| Fallback color | `var(--edu-primary)` when `child.color` absent (Assumption A2) |

### Name label

| Property | Value |
|----------|-------|
| Font size | `12.5px` |
| Font weight | `800` |
| Color | `var(--edu-text-primary)` |
| Line height | `1.2` |

### Class name label

| Property | Value |
|----------|-------|
| Font size | `10.5px` |
| Color | `var(--edu-text-muted)` |

### ARIA structure

```
<div role="tablist" aria-label="[gradeBook.childSwitcherLabel]">
  <button role="tab" aria-selected="true"  tabindex="0"  aria-controls="tabpanel-c1" id="tab-c1">...</button>
  <button role="tab" aria-selected="false" tabindex="-1" aria-controls="tabpanel-c2" id="tab-c2">...</button>
</div>
<div role="tabpanel" id="tabpanel-c1" aria-labelledby="tab-c1">
  <!-- GradeBookTable or GradeBookSkeleton or ErrorBanner -->
</div>
```

### LockedBanner (gradePublishMode = ADMIN_APPROVAL)

| Property | Value |
|----------|-------|
| Background | `var(--edu-warning)` tint (matches existing US-E13.6 LockedBanner — reuse component) |
| Text color | `var(--edu-warning-foreground)` — NOT white (accessibility, decision 0013) |
| Required elements | Lock icon + text label (not color alone; WCAG SC 1.4.1) |
| i18n key | Existing key from US-E13.6 gradeBook namespace (`notPublishedBanner` / `notPublishedDescription` or equivalent) |

---

## 8. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|-------|-------|-------------|----------|
| UC-1 | Single-child parent loads /parent/grades | TR-001, TR-007, TR-008 | 6 |
| UC-2 | Multi-child parent loads /parent/grades | TR-001, TR-002, TR-007 | 8 |
| UC-3 | Parent switches active child (mouse/pointer) | TR-003, TR-004, TR-005, TR-006, TR-007 | 7 |
| UC-4 | Child-switch fetch fails | TR-003, TR-005, TR-007 | 5 |
| UC-5 | Active child has gradePublishMode=ADMIN_APPROVAL | TR-006, TR-007 | 4 |
| UC-6 | Keyboard navigation within ChildSwitcher | TR-009 | 9 |
| UC-7 | Non-parent roles — no ChildSwitcher rendered | TR-007, TR-008 | 4 |

**Total: 7 use cases, 43 AC blocks** (42 from use-cases.md plus AC-2.8 no-horizontal-scroll).

---

## 9. Acceptance Criteria

All AC in Given/When/Then format. Grouped by UC.

---

### UC-1: Single-child parent loads /parent/grades

**AC-1.1 — Loading state (getChildList pending)**
Given the parent user navigates to `/parent/grades`,
When `getChildList()` is in flight,
Then the screen displays a loading skeleton or spinner,
And no element with `role="tablist"` is present in the DOM.

**AC-1.2 — Success: switcher absent when one child**
Given `getChildList()` resolves with exactly one child,
When the screen finishes loading,
Then no element with `role="tablist"` is rendered,
And no ChildSwitcher card (`borderRadius 12`, `border 1px solid var(--edu-border)`, `minWidth 180`) is rendered,
And `GradeBookTable` is rendered with the single child's data,
And the screen is visually and behaviorally identical to the US-E13.6 `ParentView_SingleRow` Storybook story.

**AC-1.3 — Success: single child's grades load automatically**
Given `getChildList()` resolves with `[child0]`,
When the page loads,
Then `getChildGrades` is called with `child0.childId` and the selected term,
And `GradeBookTable` renders with `child0`'s subjects, scores, and GPA,
And no user interaction is required to trigger this fetch.

**AC-1.4 — Error: getChildList fails (network-error)**
Given the parent navigates to `/parent/grades`,
When `getChildList()` fails with failure type `"network-error"`,
Then an `ErrorBanner` is displayed with the `vi` message from `gradeBook.errorNetworkError`,
And a retry button is present and keyboard-operable (reachable via Tab, activatable via Enter/Space),
And `GradeBookTable` is not rendered,
And `ChildSwitcher` is not rendered.

**AC-1.5 — Error: getChildList fails (forbidden)**
Given `getChildList()` fails with failure type `"forbidden"`,
When the error state renders,
Then an `ErrorBanner` is displayed with the `vi` message from `gradeBook.errorForbidden`,
And no retry button is rendered.

**AC-1.6 — Empty: getChildList returns empty array**
Given `getChildList()` resolves with `[]`,
When the screen finishes loading,
Then an empty state message is displayed (no grade data available),
And `ChildSwitcher` is not rendered,
And `GradeBookTable` is not rendered.
[OPEN QUESTION OQ-002: exact copy key for 0-children state — placeholder `gradeBook.noEnrolledChildren`; confirm with ba-lead before implementation.]

---

### UC-2: Multi-child parent loads /parent/grades

**AC-2.1 — Loading state (initial fetch pending)**
Given the parent navigates to `/parent/grades` and `getChildList()` is pending,
When the screen is in loading state,
Then a skeleton or spinner is shown,
And no partial ChildSwitcher renders before the child list resolves.

**AC-2.2 — ChildSwitcher renders for multi-child parent**
Given `getChildList()` resolves with N children (N ≥ 2),
When the `ChildSwitcher` mounts,
Then a container element with `role="tablist"` is present in the DOM,
And it contains exactly N elements with `role="tab"`,
And the container has visual design: `borderRadius 12`, `border 1px solid var(--edu-border)`, `padding 12`, `flexDirection column`, `gap 6`, `minWidth 180`, `background var(--edu-card)`.

**AC-2.3 — Section label rendered correctly**
Given the `ChildSwitcher` is rendered,
Then a label element is rendered with text from i18n key `gradeBook.childSwitcherLabel` (vi: "Chọn con"),
And it is styled `10.5px` / `800` / `var(--edu-text-muted)` / `UPPERCASE` / `letter-spacing 0.08em`.

**AC-2.4 — First child is active by default**
Given `getChildList()` resolves with `[child0, child1, ...]`,
When the `ChildSwitcher` renders,
Then `tab[0]` has `aria-selected="true"`,
And `tab[0]` has `border 1.5px solid child0.color` and `background child0.color+'14'`,
And `tab[1]` through `tab[N-1]` have `aria-selected="false"`,
And `tab[1]` through `tab[N-1]` have `border 1.5px solid var(--edu-border)` and `background var(--edu-card)`.

**AC-2.5 — Tab content rendered correctly**
Given the `ChildSwitcher` is rendered with `[{childId, name, className, avatar, color}]`,
Then each tab contains (a) an Avatar of `26px` size with `child.avatar` initials and `child.color`, (b) a name label in `12.5px/800/var(--edu-text-primary)`, (c) a `className` label in `10.5px/var(--edu-text-muted)`,
And all three sub-elements are visible in both `vi` and `en` locales.

**AC-2.6 — First child's grades loaded automatically**
Given `tab[0]` is the default active tab,
When the screen loads,
Then `getChildGrades` is called with `child0.childId` and the current term,
And `GradeBookTable` is populated with `child0`'s subjects, scores, and GPA,
And the `GradeBookTable` wrapper has `role="tabpanel"` associated with `tab[0]` via `aria-controls` / `aria-labelledby`.

**AC-2.7 — Touch target size**
Given the `ChildSwitcher` is rendered on a mobile viewport,
Then each tab button has a minimum tappable area of 44×44px (padding inclusive).

**AC-2.8 — No horizontal scroll at 320px**
Given the viewport width is 320px,
When the `ChildSwitcher` is rendered with any number of children,
Then no horizontal scrollbar appears on the `ChildSwitcher` card or the page,
And all child tab content is fully readable (no overflow clip on names or class labels).

---

### UC-3: Parent switches to another child (mouse/pointer)

**AC-3.1 — Loading state on switch**
Given the `ChildSwitcher` is rendered with `child0` active,
When the parent clicks `tab[1]`,
Then `GradeBookSkeleton` replaces the current `GradeBookTable` content within 320ms,
And the skeleton has no layout shift relative to the previous table position.

**AC-3.2 — aria-selected updates on click**
Given the parent clicks `tab[1]`,
Then `tab[1]` immediately has `aria-selected="true"`,
And `tab[0]` immediately has `aria-selected="false"`,
And `tab[1]` visual style updates to `1.5px solid child1.color` border and `child1.color+'14'` background,
And `tab[0]` visual style reverts to `1.5px solid var(--edu-border)` border and `var(--edu-card)` background.

**AC-3.3 — GradeBookTable refreshes with child1 data**
Given `getChildGrades(child1.childId, term)` resolves successfully,
When the fetch completes,
Then `GradeBookTable` displays `child1`'s subjects, scores, and GPA,
And none of `child0`'s subjects, scores, or GPA values are shown,
And the `tabpanel` is associated with the newly active tab.

**AC-3.4 — TanStack Query key changes on switch**
Given the parent switches from `child0` to `child1`,
Then the TanStack Query key changes from `['gradeBook', 'child', child0.childId, term]` to `['gradeBook', 'child', child1.childId, term]`,
And if `child1`'s data is cached, no network request is made and skeleton is skipped.

**AC-3.5 — Term selector does not reset on child switch**
Given the parent has selected term `"HK2"` and then switches active child,
Then the term selector remains on `"HK2"`,
And the new child's grades are fetched for `"HK2"`.

**AC-3.6 — ChildSwitcher remains visible during and after switch**
Given the parent clicks a new tab,
Throughout the loading and success states,
Then the `ChildSwitcher` card is always visible and interactive,
And it is never unmounted during the fetch lifecycle.

**AC-3.7 — Reduced-motion gate on switch transition**
Given the user's OS has `prefers-reduced-motion: reduce` set,
When the parent switches children,
Then any CSS transition on the `GradeBookTable` area is instant (0ms or removed),
And no animation plays on the `ChildSwitcher` tab active-state change.

---

### UC-4: Child-switch fetch fails

**AC-4.1 — Error state: network-error with retry**
Given the parent clicks `tab[N]` and `getChildGrades` fails with `"network-error"`,
When the error state renders,
Then `GradeBookSkeleton` is replaced by an `ErrorBanner`,
And the `ErrorBanner` displays the `vi` message from `gradeBook.errorNetworkError`,
And a retry button is rendered and keyboard-operable (Tab-reachable, Enter/Space-activatable),
And the `ChildSwitcher` card remains fully visible.

**AC-4.2 — Error state: forbidden — no retry**
Given `getChildGrades` fails with `"forbidden"`,
When the error state renders,
Then an `ErrorBanner` is shown with the `vi` message from `gradeBook.errorForbidden`,
And no retry button is rendered,
And the parent can click a different child tab to switch.

**AC-4.3 — Retry recovers to success**
Given the parent is in the `network-error` state for `tab[N]`,
When the parent clicks the retry button,
Then `GradeBookSkeleton` is shown,
And `getChildGrades` is re-called with the same `childId` and `term`,
And on success `GradeBookTable` renders `child[N]`'s data.

**AC-4.4 — Failed child does not corrupt cached child data**
Given `child0` was successfully loaded and the parent switches to `child1` which fails,
When the parent clicks back to `tab[0]`,
Then `getChildGrades` for `child0` is served from TanStack Query cache,
And `GradeBookTable` renders `child0`'s previously loaded data without a new network request.

**AC-4.5 — Error messages in both locales**
Given the error state is active,
Then the `ErrorBanner` message is localized (vi: matches `gradeBook.error<FailureType>` in `vi.json`; en: matches `gradeBook.error<FailureType>` in `en.json`),
And no raw failure type code (e.g. `"network-error"`) is displayed to the user.

---

### UC-5: Active child has gradePublishMode=ADMIN_APPROVAL

**AC-5.1 — LockedBanner shown for unpublished child**
Given `child0`'s grade response has `gradePublishMode=ADMIN_APPROVAL` and at least one unpublished score,
When `child0` is the active tab,
Then a `LockedBanner` is rendered above `GradeBookTable`,
And the banner contains both a lock icon and a text label (not color alone),
And the banner background uses `var(--edu-warning)` tint; text uses `var(--edu-warning-foreground)` (not white, decision 0013),
And unpublished score cells are masked (display `"--"` or the design-spec treatment).

**AC-5.2 — LockedBanner absent for published child**
Given `child1`'s grade response has `gradePublishMode=SELF_PUBLISH` with all scores published,
When the parent switches to `tab[1]`,
Then `LockedBanner` is NOT present in the DOM for `child1`'s `tabpanel`,
And all score cells display their numeric values.

**AC-5.3 — LockedBanner re-appears on switch back**
Given the parent was on `child0` (ADMIN_APPROVAL) then switched to `child1` (SELF_PUBLISH) then switches back to `child0`,
When `child0`'s tab is re-activated,
Then `LockedBanner` re-renders,
And masked score cells are masked again,
And `child1`'s data is no longer visible.

**AC-5.4 — Banner is per-child, not global**
Given `child0` has `ADMIN_APPROVAL` and `child1` has `SELF_PUBLISH`,
When the parent views both children in succession,
Then the `LockedBanner` state is determined solely by the active child's `gradePublishMode`,
And switching children correctly toggles the banner without any persistent global state.

---

### UC-6: Keyboard navigation within ChildSwitcher

**AC-6.1 — ArrowRight moves focus, does not fetch**
Given focus is on `tab[0]` in the `ChildSwitcher`,
When the parent presses ArrowRight,
Then focus moves to `tab[1]`,
And `aria-selected` remains `"true"` on `tab[0]` and `"false"` on `tab[1]`,
And no `getChildGrades` fetch is triggered.

**AC-6.2 — ArrowLeft moves focus, does not fetch**
Given focus is on `tab[1]` in the `ChildSwitcher`,
When the parent presses ArrowLeft,
Then focus moves to `tab[0]`,
And `aria-selected` is unchanged,
And no fetch is triggered.

**AC-6.3 — ArrowRight wraps from last tab to first**
Given focus is on the last tab (`tab[N-1]`),
When the parent presses ArrowRight,
Then focus wraps to `tab[0]`,
And no fetch is triggered.

**AC-6.4 — ArrowLeft wraps from first tab to last**
Given focus is on `tab[0]`,
When the parent presses ArrowLeft,
Then focus wraps to `tab[N-1]`,
And no fetch is triggered.

**AC-6.5 — Enter activates focused tab and triggers fetch**
Given focus is on `tab[1]` (not currently active),
When the parent presses Enter,
Then `tab[1]` becomes active (`aria-selected="true"` on `tab[1]`, `"false"` on all others),
And `getChildGrades(child1.childId, term)` is triggered,
And the fetch lifecycle (loading/success/error) follows UC-3 / UC-4.

**AC-6.6 — Space activates focused tab and triggers fetch**
Given focus is on `tab[1]` (not currently active),
When the parent presses Space,
Then the same behavior as AC-6.5 occurs,
And the page does not scroll (Space default scroll behavior is prevented on `role="tab"`).

**AC-6.7 — Roving tabindex: only active tab is in natural tab order**
Given the `ChildSwitcher` is rendered,
Then the currently active tab button has `tabindex=0`,
And all inactive tab buttons have `tabindex=-1`,
When the parent uses the Tab key from outside the `ChildSwitcher`,
Then focus lands on the active tab button (not necessarily `tab[0]` if a different tab is active).

**AC-6.8 — Focus ring visible on focused tab**
Given any tab button is focused via keyboard,
Then a visible focus ring is rendered using the `--ring` CSS token,
And `outline` is NOT set to `"none"` without a visible replacement.

**AC-6.9 — Tab key exits ChildSwitcher**
Given focus is on any tab button in the `ChildSwitcher`,
When the parent presses Tab (not ArrowRight),
Then focus moves to the next focusable element outside the `ChildSwitcher` in DOM order,
And focus does NOT cycle through remaining tab buttons.

---

### UC-7: Non-parent roles — no ChildSwitcher rendered

**AC-7.1 — Teacher role: no tablist in DOM**
Given an authenticated user with role `"teacher"` is on `/teacher/grades`,
Then no element with `role="tablist"` related to child-switching is present in the DOM,
And the grade book screen renders the teacher-role view as per US-E13.6 AC-5.

**AC-7.2 — Principal role: no tablist in DOM**
Given an authenticated user with role `"principal"` is on `/principal/grades`,
Then no element with `role="tablist"` related to child-switching is present in the DOM.

**AC-7.3 — Student role: no tablist in DOM**
Given an authenticated user with role `"student"` is on `/student/grades`,
Then no element with `role="tablist"` related to child-switching is present in the DOM,
And the student single-row view renders as per US-E13.6 AC-6.

**AC-7.4 — US-E13.6 regression guard**
Given US-E13.7 code changes are applied,
When the full US-E13.6 test suite runs,
Then all 739 tests pass with no failures or skips introduced by this story.

---

## 10. Edge-Case Matrix

| # | Scenario | `childrenList` state | Expected behavior |
|---|----------|----------------------|-------------------|
| 1 | 0 children (empty list) | `[]` | Empty state shown; `ChildSwitcher` NOT rendered; `GradeBookTable` NOT rendered. [OQ-002: confirm copy key] |
| 2 | 1 child (base single) | `[child0]` | `ChildSwitcher` NOT rendered; grades loaded automatically; US-E13.6 regression unchanged |
| 3 | 2 children (base multi) | `[child0, child1]` | `ChildSwitcher` renders 2 tabs; `child0` active by default; ArrowRight wraps from `tab[1]` to `tab[0]` |
| 4 | 3+ children | `[c0, c1, c2, ...]` | All N tabs rendered; no horizontal scroll at 320px; wrap-around at both ends |
| 5 | Active child has ADMIN_APPROVAL | `child0.publishMode = ADMIN_APPROVAL` | `LockedBanner` shown; masked cells; absent when switching to other children |
| 6 | Network error on switch | `getChildGrades` fails (`network-error`) | `ErrorBanner` + retry; `ChildSwitcher` stays visible; other children's cached data unaffected |
| 7 | Forbidden on switch | `getChildGrades` fails (`forbidden`) | `ErrorBanner` without retry; parent can switch to another child |
| 8 | Keyboard nav — ArrowRight from last tab | focus on `tab[N-1]` | Focus wraps to `tab[0]`; no fetch; `aria-selected` unchanged |
| 9 | Keyboard nav — ArrowLeft from first tab | focus on `tab[0]` | Focus wraps to `tab[N-1]`; no fetch; `aria-selected` unchanged |
| 10 | Auth token expired during fetch | 401 `TOKEN_EXPIRED` mid-fetch | Existing proactive/reactive refresh (`bootstrap/lib` behavior) retries original `getChildGrades`; if refresh fails → redirect to `/login` |
| 11 | Rapid successive tab clicks | `tab[1]` then `tab[2]` before `tab[1]` resolves | Only `child2` fetch result applied; stale `child1` result discarded; `child2` tab remains active |
| 12 | Reduced-motion preference | `prefers-reduced-motion: reduce` | All transitions on switch are instant; no animation on active-state change |
| 13 | 320px viewport with 3+ children | viewport = 320px, N = 3 | No horizontal scroll; tab card stacks vertically; names truncate with `text-overflow: ellipsis` if needed; no clipped touch targets |
| 14 | Non-parent role (teacher/principal/student) | N/A | `ChildSwitcher` absent; no `tablist` in DOM; 739 US-E13.6 tests pass |

---

## 11. Storybook Stories

### Required (4 — proof owed)

| Story name | UC / AC | Purpose | Viewport |
|------------|---------|---------|----------|
| `ParentView_SingleChild` | UC-1 / AC-1.2 | Regression guard: `ChildSwitcher` absent; single-child grade book renders; no `tablist` in DOM; confirms US-E13.6 `ParentView_SingleRow` parity | default |
| `ParentView_MultiChild_Tab1` | UC-2 / AC-2.2, AC-2.4, AC-2.5, AC-2.6 | Default multi-child state: `ChildSwitcher` rendered; `child0` (Nguyễn Minh Khoa / 11A2) active; 2 tabs; correct ARIA; grade data for `child0` in table | default |
| `ParentView_SwitchLoading` | UC-3 / AC-3.1 | After clicking `tab[1]`: skeleton visible; `aria-selected` updated to `tab[1]`; `ChildSwitcher` still present | default |
| `ParentView_MultiChild_Switch` | UC-3 / AC-3.3 | After fetch resolves for `child1` (Nguyễn Thu Hà / 8B1): `GradeBookTable` shows `child1`'s subjects and scores; `tab[0]` inactive; `tab[1]` active | default |

### Recommended (2 — not blocking)

| Story name | UC / AC | Purpose |
|------------|---------|---------|
| `ParentView_SwitchError` | UC-4 / AC-4.1 | Error state: `ErrorBanner` visible; retry button present; `ChildSwitcher` intact |
| `ParentView_LockedBanner` | UC-5 / AC-5.1 | `child0` active with `ADMIN_APPROVAL`: `LockedBanner` rendered; masked cells |

---

## 12. Scope Boundary

| Item | Status | Notes |
|------|--------|-------|
| `ChildSwitcher` component | IN | Feature-local at `features/grades/presentation/child-switcher/` |
| `GradeBookScreenVM` extension (`childrenList`, `activeChildId`) | IN | Additive — does not break existing VM shape |
| `getChildList()` on `IGradeBookRepository` | IN | New method; stub in real repo; mock implementation with seed |
| `GRADES_EP.childList` endpoint constant | IN | New constant in `bootstrap/endpoint/grades.endpoint.ts` |
| `MockGradeBookRepository` childId-dispatch | IN | Extends `getChildGrades` to dispatch on `childId` |
| `gradePublishMode` gate per active child | IN | Re-evaluates per switch; reuses existing `LockedBanner` from US-E13.6 |
| Keyboard nav (ArrowLeft/Right focus; Enter/Space activate) | IN | ARIA tablist pattern |
| 4 required Storybook stories | IN | Proof owed |
| Unit + integration tests | IN | TDD — red→green→refactor per `.claude/rules/tdd.md` |
| TermPicker card | OUT | Existing; untouched |
| Contact-teacher strip | OUT | Out of scope for this story |
| Any mutation | OUT | Fully read-only |
| Promoting `ChildSwitcher` to `components/shared/` | OUT | Deferred; promote when second screen requires it (component-organization rule) |
| Live `core` service integration | OUT | Mock-first (decision 0014) until service is live |
| `childrenList` sourcing beyond VM prop | OUT | RSC page resolves and passes the prop; this story consumes it |

---

## 13. Open Questions

| ID | Question | Default / Fallback | Owner | Blocking? |
|----|----------|--------------------|-------|-----------|
| OQ-001 | What is the authoritative source for the parent's child list? (a) JWT claim, (b) `GET /core/api/v1/parent/children`, (c) `GET /users/me` profile field. If (a): no async loading states needed for child list; `getChildList()` resolves synchronously from session. If (b): separate TanStack Query key `['gradeBook', 'children']` + loading/error states required. | Mock-first `MockGradeBookRepository.getChildList()` until confirmed (decision 0014) | ba-lead / core service BE team | No — mock-first unblocks FE; impacts loading state complexity |
| OQ-002 | What is the expected behavior and copy key when a parent has 0 enrolled children? Is this state even reachable in the current product flow? Can `gradeBook.emptyState` be reused, or is a new key (`gradeBook.noEnrolledChildren`) needed? | Placeholder key `gradeBook.noEnrolledChildren`; do NOT add the key to `messages/{vi,en}.json` until confirmed (NFR-007 constraint) | ba-lead (product decision) | No — edge case unlikely to block demo |
| OQ-003 | Does the `ChildSwitcher` card appear ABOVE or BESIDE the `GradeBookTable`? The design source shows a horizontal side-by-side layout (child selector left, table right) at wide viewports. At 320px it must reflow vertically. What is the breakpoint value? | Per design-spec: `flexDirection column` (vertical card), `minWidth 180`. Layout relative to table needs UX confirmation; design-spec does not specify `flex-direction` of the outer row container. | uiux-lead (DR-002 layout confirmation) | No — default to vertical-card-above-table at 320px; layout gap filled by FE-lead at implementation |
| OQ-004 | Should ArrowLeft/ArrowRight also auto-activate the focused tab ("selection follows focus" ARIA pattern), or should they only move focus (requiring explicit Enter/Space to activate)? Current spec says focus-only (BR-009). If TanStack Query cache is warm, "selection follows focus" is acceptable per WAI-ARIA authoring practices. | Focus-only confirmed (BR-009); "selection follows focus" deferred pending UX confirmation | ba-lead / uiux-lead (UX decision) | No — focus-only is already specced; change requires spec revision |

---

## 14. Assumptions

| ID | Assumption | Impact if wrong |
|----|------------|-----------------|
| A1 | `childrenList` (including `child.color`) is available on the parent session claim/profile and is passed to `GradeBookScreenVM` by the RSC page (US-E13.6 infrastructure already in place). | If not, RSC page needs a server fetch for child list before mounting the client component; INT-001 loading/error states become page-level, not component-level. |
| A2 | `child.color` fallback to `var(--edu-primary)` when absent or unrecognized. | Cosmetic only; tab still renders. |
| A3 | On a failed child switch, the error state is overlaid in the `tabpanel` area; `activeChildId` reverts to the prior valid child's ID only if the parent explicitly clicks a different tab (not automatically). The active tab visually stays on the failed child while error is shown. | If auto-revert is required, `fe-lead` must add revert logic — flag as implementation detail. |
| A4 | `selectedTerm` is carried forward unchanged on child switch; no term auto-reset occurs. | If BE requires a valid term per child (e.g. different academic years), term reset logic is needed. |
| A5 | The RSC page for `/parent/grades` already resolves the parent's `childrenList` as part of US-E13.6 infrastructure; this story only needs to extend the VM and consume the prop. | If the RSC page does not currently resolve `childrenList`, it must be added in this story. |

---

## 15. Constraints

| Constraint | Source |
|------------|--------|
| Mock-first for `core` service — `GradeBookRepository.getChildList()` stubs `NOT_IMPLEMENTED`; `MockGradeBookRepository` returns seed | decision 0014 |
| Reuse `GetChildGradesUseCase` as-is — call with correct `childId`; no new use case | story.md §Design Notes |
| Extend `GradeBookScreenVM` additively — existing VM shape unchanged | TR-008, US-E13.6 regression guard |
| Feature-local component placement for `ChildSwitcher` — `features/grades/presentation/child-switcher/`; promote to `components/shared/` only when second screen needs it | `.claude/rules/component-organization.md`, decision 0026 |
| Tokens only — no raw hex colors; `child.color+'14'` pattern follows ≈8% opacity tint convention already in use (`/15` in Badge, `/18` in StatCard) | `.claude/rules/design-system.md`, `src/app/tokens.css` |
| `gradeBook.childSwitcherLabel` is the only ChildSwitcher copy key; no new keys without OQ-002 resolution | NFR-007 |
| All UI copy keyed in both `vi.json` and `en.json` under `gradeBook` namespace | `.claude/rules/i18n.md` |
| All transitions gated behind `@media (prefers-reduced-motion: reduce)` | NFR-008, `.claude/rules/accessibility.md` |
| WCAG 2.1 AA is a "done" criterion — `role="tablist"` / `role="tab"` / `aria-selected` / `role="tabpanel"` pattern required; roving tabindex required | NFR-001..NFR-003, `.claude/rules/accessibility.md` |
| TDD — tests written before implementation (red → green → refactor) | `.claude/rules/tdd.md` |

---

## 16. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | AC(s) | Test Layer | Priority |
|-------------|--------|-------------|----------------|-------|-----------|----------|
| TR-001: Hide/show ChildSwitcher based on childrenList.length | story.md AC1, use-cases.md BR-001 | UC-1, UC-2, UC-7 | INT-001 | AC-1.2, AC-2.2, AC-7.1–7.4 | Unit (visibility logic) + Story | Must |
| TR-002: Tab visual design (avatar, name, className, colors, label) | design-spec gradeBook.parent.childSwitcher | UC-2 | INT-001 | AC-2.3, AC-2.4, AC-2.5 | Story (visual regression) | Must |
| TR-003: Tab click → fetch → skeleton → table | story.md AC3, UC-3 | UC-3, UC-4 | INT-002 | AC-3.1, AC-3.2, AC-3.3, AC-4.1–4.3 | Unit (use-case call) + Integration (mock dispatch) + Story | Must |
| TR-004: Skeleton ≤320ms, CLS=0 | NFR-004, NFR-005 | UC-3 | INT-002 | AC-3.1, AC-3.6 | Story (interaction timeline assertion) | Must |
| TR-005: Per-child data isolation; TQ key changes on switch | UC-3 BR-004, use-cases.md | UC-3, UC-4 | INT-002 | AC-3.3, AC-3.4, AC-4.4 | Unit (query key) + Integration (childId dispatch) | Must |
| TR-006: gradePublishMode gate per active child | story.md AC4, UC-5 | UC-5 | INT-002 | AC-5.1–5.4 | Unit (mode evaluation per child) + Story | Must |
| TR-007: Read-only — no mutations | story.md §Design Notes | UC-1..7 | — | AC-7.1–7.4 | Unit (no write calls) | Must |
| TR-008: Non-parent roles unaffected; 739 US-E13.6 tests pass | story.md AC5 | UC-7 | — | AC-7.1–7.4 | Unit (existing suite regression) | Must |
| TR-009: Keyboard nav ArrowLeft/Right (focus-only); Enter/Space (activate); roving tabindex; wrap | UC-6 BR-009/010/011 | UC-6 | — | AC-6.1–6.9 | Unit (keyboard event handlers) + Story (a11y interaction) | Should |
| NFR-001: ARIA roles/attributes (WCAG 2.1 AA SC 4.1.2) | use-cases.md UC-6 preconditions | UC-2, UC-3, UC-6, UC-7 | — | AC-2.2, AC-2.6, AC-6.7 | axe-core (a11y auditor) + Story | Must |
| NFR-002: 44×44px touch target; visible focus ring (WCAG 2.1 AA SC 2.5.5, 2.4.7) | use-cases.md UC-2 NFR | UC-2, UC-6 | — | AC-2.7, AC-6.8 | Story (viewport 320px) + manual keyboard | Must |
| NFR-003: Active state not color-only (WCAG 2.1 AA SC 1.4.1) | use-cases.md UC-2 NFR | UC-2, UC-3, UC-6 | — | AC-2.4, AC-3.2, AC-6.1 | axe-core + forced-color check | Must |
| NFR-004: Skeleton ≤320ms | use-cases.md UC-3 NFR | UC-3 | INT-002 | AC-3.1 | Story interaction timeline | Should |
| NFR-005: CLS=0 | use-cases.md UC-3 NFR | UC-3 | INT-002 | AC-3.1 | Lighthouse / visual snapshot | Should |
| NFR-006: No horizontal scroll at 320px | use-cases.md UC-2 NFR | UC-2 | — | AC-2.8 | Story at 320px viewport | Must |
| NFR-007: i18n — gradeBook namespace; no new keys | use-cases.md UC-2 NFR | UC-1..7 | — | AC-2.3, AC-4.5 | `tsc --noEmit` + grep diacritics | Must |
| NFR-008: Reduced-motion gate on all transitions | use-cases.md UC-3 NFR | UC-3 | — | AC-3.7 | Story in reduced-motion viewport | Must |

---

## 17. Validation Proof Table

Mirrors the story.md `Validation` section. This is what `fe-lead` must deliver as TEST_MATRIX proof rows.

| Layer | Expected Proof | Story / AC Reference |
|-------|---------------|----------------------|
| Unit | `ChildSwitcher` renders / hides based on `childrenList.length` (TR-001) | AC-1.2, AC-2.2, AC-7.1–7.4 |
| Unit | `getChildGrades` called with correct `childId` on tab click; correct `childId` on Enter/Space keyboard activation | AC-3.1, AC-6.5, AC-6.6 |
| Unit | TanStack Query key `['gradeBook', 'child', childId, term]` changes on switch (TR-005) | AC-3.4 |
| Unit | `gradePublishMode` gate evaluates per active child — `LockedBanner` shows/hides correctly (TR-006) | AC-5.1–5.4 |
| Unit | ArrowLeft/Right handler moves focus without triggering fetch; boundary wrap at both ends (TR-009) | AC-6.1–6.4 |
| Unit | Roving tabindex: active tab `tabindex=0`, inactive tabs `tabindex=-1` (TR-009, BR-010) | AC-6.7 |
| Unit | No write/mutation calls present in any ChildSwitcher code path (TR-007) | AC-7.1–7.4 |
| Integration | `MockGradeBookRepository.getChildGrades('c1', term)` returns `MOCK_GRADE_BOOK_ROWS_CHILD_0`; `getChildGrades('c2', term)` returns `MOCK_GRADE_BOOK_ROWS_CHILD_1`; fallback returns `[0]` (INT-002 dispatch) | AC-3.3, AC-4.4 |
| Integration | `MockGradeBookRepository.getChildList()` returns `VIEWER_CHILDREN` seed `[{childId:'c1',...},{childId:'c2',...}]` (INT-001 mock) | AC-2.2 |
| E2E / Story | `ParentView_SingleChild` — no `role="tablist"` in DOM; `GradeBookTable` renders with seed child0 data (UC-1 regression) | AC-1.2, AC-1.3 |
| E2E / Story | `ParentView_MultiChild_Tab1` — `ChildSwitcher` rendered; `child0` active (`aria-selected="true"`); correct tab content (avatar, name, className); `GradeBookTable` shows Nguyễn Minh Khoa 11A2 data | AC-2.2–2.6 |
| E2E / Story | `ParentView_SwitchLoading` — after clicking `tab[1]`: `GradeBookSkeleton` visible; `tab[1]` has `aria-selected="true"`; `ChildSwitcher` still present | AC-3.1, AC-3.2 |
| E2E / Story | `ParentView_MultiChild_Switch` — after fetch resolves for `child1`: `GradeBookTable` shows Nguyễn Thu Hà 8B1 data; `tab[0]` inactive; `tab[1]` active | AC-3.3 |
| Platform | — | — |
| Release | Design-review gate passed (`/impeccable audit` on `ChildSwitcher`); US-E13.6 full test suite = 739/739 pass | AC-7.4 |

---

## 18. Handoff to FE

### What `fe-lead` should build

1. **New component** `features/grades/presentation/child-switcher/child-switcher.tsx` (feature-local per constraint; with `child-switcher.i-vm.ts` ViewModel interface and `child-switcher.stories.tsx`).
2. **VM extension** — extend `GradeBookScreenVM` additively with `childrenList: ChildSummary[] | undefined` and `activeChildId: string | undefined`; parent role branch sets these; all other roles leave them `undefined`.
3. **Repository extension** — add `getChildList(): Promise<ChildSummary[]>` to `IGradeBookRepository`; stub in `GradeBookRepository`; implement with seed in `MockGradeBookRepository`.
4. **Endpoint constant** — add `childList: '/core/api/v1/parent/children'` to `GRADES_EP`.
5. **Mock fixture** — add `MOCK_GRADE_BOOK_ROWS_CHILD_0` and `MOCK_GRADE_BOOK_ROWS_CHILD_1` seed constants; make `MockGradeBookRepository.getChildGrades` dispatch on `childId`.
6. **ARIA pattern** — `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / `role="tabpanel"` / roving tabindex / Arrow key + Enter/Space handlers exactly as specced.
7. **Four required Storybook stories** (§11).
8. **TDD** — unit tests before component code; integration tests for mock dispatch; all per `.claude/rules/tdd.md`.

### Suggested lane

**Normal** — no new tokens, no new i18n keys (only reuse of `gradeBook.childSwitcherLabel`), no new routes, additive VM extension, mock-first. Medium complexity due to ARIA tablist pattern and data isolation requirement.

### Proof owed (TEST_MATRIX rows to add)

All rows in §17 Validation Proof Table. Key gates:
- `US-E13.6` regression: 739/739 tests pass after this story's changes.
- Design-review gate: `/impeccable audit` on `ChildSwitcher` before closing story.
- `tsc --noEmit` passes (typed i18n keys; no new keys outside NFR-007).
- Storybook: 4 required stories render without console errors at default and 320px viewports.
- axe-core: zero ARIA violations on `ParentView_MultiChild_Tab1` story.

### Flags for `fe-lead` attention

- **OQ-001** (child list source): Implementation uses async mock path; if BE confirms JWT-claim source, the `getChildList()` TanStack Query key and loading states can be removed — plan for this divergence.
- **OQ-003** (responsive layout): `ChildSwitcher` is a vertical card (`flexDirection column`); its position relative to `GradeBookTable` (above vs. beside at wide viewport) needs confirmation from `uiux-lead` before implementing the outer layout row. Default to above-table until confirmed.
- **A3** (error state revert): Spec says active tab stays on failed child; if product wants auto-revert to last valid child, flag to ba-lead for spec revision.
- **`child.color+'14'` pattern**: CSS variable values cannot have string appended at runtime; `fe-lead` must resolve this as an implementation detail (e.g. using `color-mix`, CSS custom property override, or `bg-opacity` utility). This is an implementation decision — not specified here.
