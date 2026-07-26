# Component Architecture — US-E13.8 Principal Classes

Author: `fe-component-architect`. Refines plan.md §3/§4/§6 for
`features/principal/presentation/classes/`. Architecture/contracts only — no
implementation code. Reads: `spec.md`, `plan.md` (locked decisions §0),
`principal-teachers-screen.tsx`, `class-management-screen.tsx` +
`class-management-screen.i-vm.ts`, `pl-filter-bar.tsx`,
`components/shared/load-more-button/`, `class.entity.ts`,
`class-management.failure.ts`.

## 1. Architecture Summary

- **Scope:** presentation layer only for `(app)/principal/classes` — table
  (≥768px) / card list (<768px) of `Class` rows, client-side status/grade/name
  filter + sort, server "load more" pagination, 2 error variants, 2 empty
  variants, optional CTA.
- **New components (all feature-local, canonical homes below):**
  `PrincipalClassesScreen` (orchestrator), `ClassFiltersBar`, `ClassesTable`,
  `ClassesCardList`, `ClassRowStatusBadge`-via-shared-`StatusBadge` (no new
  component, see §5), `ClassesEmptyState`, `ClassesErrorState`,
  `ClassesLoadingSkeleton`, `ViewTeachersCta` (Could-have), plus a pure
  `deriveVisibleClasses()` filter/sort function (not a component — co-located
  `.ts`).
- **Reused as-is, zero changes:** `components/ui/table/*`, `components/ui/select`,
  `components/ui/input`, `components/ui/button`, `components/ui/skeleton`,
  `components/shared/status-badge` (`StatusBadge`/`StatusTone`),
  **`components/shared/load-more-button`** (`LoadMoreButton`).
- **Correction to plan.md §2 Phase 4 / §4:** plan.md assumed no shared
  load-more control exists yet and proposed building one feature-local. That
  premise is **stale** — `components/shared/load-more-button/` already exists,
  promoted from `moderation-screen` on its 2nd caller (US-E19.1, comment cites
  it explicitly) and is reused today by `notifications-center` and
  (feature-locally, NOT via the shared one — a pre-existing, out-of-scope
  drift) `audit-log`. **This screen MUST consume the canonical
  `components/shared/load-more-button/LoadMoreButton` directly — do NOT build
  a third feature-local copy.** Flagged to `fe-lead`: the `audit-log`
  feature-local duplicate at
  `features/audit-log/presentation/audit-log-screen/components/load-more-button.tsx`
  is a pre-existing component-organization drift, out of scope for this US,
  worth a backlog cleanup item (delete + point audit-log at the shared one).
- **No missing shadcn primitives.** `table`, `select`, `input`, `button`,
  `skeleton` all exist and are already used by the two precedent screens.
- **Key decisions:**
  1. `ARCHIVED` badge tone = **`muted`** — CONFIRMED, not just by convention
     but by direct sibling-screen precedent: `class-management-screen.tsx:253`
     already renders `tone={c.status === "ACTIVE" ? "success" : "muted"}` for
     this EXACT `Class.status` field. No divergence risk — same entity, same
     enum, same screen family. See §6 Q1.
  2. Mobile card layout = **stacked, single-column, label-above-value for
     homeroom/count, name as card title** (not two-column grid). See §6 Q2.
  3. `ClassFiltersBar` = **feature-local**, not `components/shared/` — every
     filter-bar in the codebase (`pl-filter-bar`, `qb-filter-bar`,
     `lesson-plan-filter-bar`, `exam-bank-filter-bar`,
     `sd-violation-filter-bar`, `lesson-bank-filter-bar`, `queue-filter-bar`,
     audit-log's `filter-bar`) is feature-local because field sets differ
     per screen (grade+status here vs. class+date-range there, etc.) — there
     is no shared `FilterBar` primitive in this codebase and none should be
     invented for a 1-consumer field combination. See §5.

## 2. Component Tree

```
PrincipalClassesScreen                                    'use client', container
│ (orchestrator: local useState, derives visible rows via useMemo)
│
├── ClassesScreenHeader                                    presentational
│   ├── <h1> title + StatusBadge(tone="primary") count      [reused: StatusBadge]
│   └── ViewTeachersCta (Could-have, phased per plan.md §5)  presentational, controlled
│
├── ClassFiltersBar                                         presentational, controlled
│   ├── Select (status: active|archived|all)                [reused: ui/select]
│   ├── Select (grade: all|1..N)                             [reused: ui/select]
│   ├── Input (name search)                                  [reused: ui/input]
│   └── Button "Clear filters" (conditional, hasActiveFilter) [reused: ui/button]
│
└── Body (screen picks ONE branch below based on vm.fetchError / loading / row count)
    ├── ClassesLoadingSkeleton                               presentational
    │   ├── table variant (≥768px, reuses ui/table + ui/skeleton cells)
    │   └── card variant (<768px, reuses ui/skeleton blocks)
    ├── ClassesErrorState                                    presentational
    │   (variant="network" | "forbidden")
    ├── ClassesEmptyState                                    presentational
    │   (variant="zero-tenant" | "zero-filtered", onClearFilters when filtered)
    └── SuccessView                                          presentational
        ├── ClassesTable (≥768px)                            presentational
        │   rows: name · gradeLevel · homeroom|placeholder ·
        │         studentCount · StatusBadge(tone)            [reused: ui/table, StatusBadge]
        ├── ClassesCardList (<768px)                          presentational
        │   same fields, stacked card layout
        └── LoadMoreButton                                    [REUSED AS-IS from
                                                                 components/shared/load-more-button]
```

**RSC boundary (outside this tree, plan.md Phase 3, not re-derived):**
`(app)/principal/classes/page.tsx` (RSC) → builds `PrincipalClassesVm` →
renders `<PrincipalClassesScreen vm={vm} onLoadMore={loadMoreClassesAction} />`.
`loadMoreClassesAction` is a `'use server'` Server Action ref, passed as a
prop — the client tree never imports `bootstrap/di`/`infrastructure`.

**Container vs. presentational:**
- `PrincipalClassesScreen` = the ONLY container/stateful component. Owns all
  `useState`, the `useMemo` derivation, and the `onLoadMore` orchestration
  (loading flag, error capture, array append).
- Every other component in the tree is **presentational** (props-only,
  internal state limited to purely-visual concerns if any — none needed here).
  `ClassFiltersBar` is presentational-but-**controlled** (all filter values are
  props; it emits change events, never owns filter state itself).

## 3. Canonical-home decisions (per `component-organization.md`'s decision tree)

| Component | Nature | Home | Reasoning |
| --- | --- | --- | --- |
| `PrincipalClassesScreen` | composed, 1 screen | `features/principal/presentation/classes/` | screen orchestrator, never shared by definition |
| `ClassFiltersBar` | composed (Select×2 + Input + Button), 1 screen, field set unique to this screen | `features/principal/presentation/classes/` | grepped all 8 existing filter-bars — every one is feature-local; no shared `FilterBar` exists or should exist (field sets don't align) |
| `ClassesTable` | composed, 1 screen (table shell reused, but row/column set is unique) | `features/principal/presentation/classes/` | mirrors `PrincipalTeachersScreen`'s pattern of inlining its own table markup around shared `ui/table` primitives — no shared "generic data table" component exists in this codebase to extend instead |
| `ClassesCardList` | composed, 1 screen, no precedent field set | `features/principal/presentation/classes/` | first-of-its-kind field combination (§6 Q2) — stays feature-local until a 2nd screen needs this exact card shape (promote then, don't pre-abstract) |
| `ClassesEmptyState` / `ClassesErrorState` / `ClassesLoadingSkeleton` | composed, 1 screen | `features/principal/presentation/classes/` | copy/fields are screen-specific (2 empty variants, 2 error variants tied to `ClassManagementFailure`) — no shared generic empty/error component exists in this codebase (each screen inlines its own, e.g. `principal-teachers-screen.tsx`'s inline `role="alert"` block) |
| `ViewTeachersCta` | tiny composed (Button + Link), 1 screen | `features/principal/presentation/classes/` | 2 AC, trivial; not a candidate for promotion |
| `LoadMoreButton` | composed, cursor pagination | **`components/shared/load-more-button/`** (existing) | **REUSE, do not create.** Already promoted (US-E19.1). This is the 3rd real consumer (after `moderation-screen`, `notifications-center`) — exactly the "promote on 2nd use" rule already exercised; using it again is the compliant path, forking it would recreate the exact anti-pattern the rule exists to prevent. |
| `StatusBadge` (tone=`success`/`muted`) | primitive variant, already generalized via `tone` prop | **`components/shared/status-badge/`** (existing) | REUSE as-is — no new component, no new tone needed (`success`/`muted` both already defined) |
| `deriveVisibleClasses()` | pure function, not a component | co-located `features/principal/presentation/classes/derive-visible-classes.ts` | filter/sort logic is screen-specific composition of `Class` fields; not UI, not shared — a plain utility, cheapest Vitest unit-test surface per plan.md Phase 4 |

**No `ui/` primitive gaps.** Everything needed (`table`, `select`, `input`,
`button`, `skeleton`) already exists under `components/ui/`. No `bun ui:add`
required.

## 4. ViewModel + Prop Interfaces

### 4.1 `principal-classes-screen.i-vm.ts` (the RSC↔client contract)

```ts
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { ClassManagementFailure } from "@/features/admin/class-management/domain/failures/class-management.failure";

export interface ClassListPage {
  data: Class[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LoadMoreResult {
  ok: boolean;
  data?: ClassListPage;
  errorKey?: ClassManagementFailure["type"];
}

export interface PrincipalClassesVm {
  classes: Class[];
  nextCursor: string | null;
  hasMore: boolean;
  academicYear: string;
  /** Set only when the INITIAL RSC-side fetch failed; null on success. */
  fetchError: ClassManagementFailure["type"] | null;
}

export interface PrincipalClassesScreenProps {
  vm: PrincipalClassesVm;
  /** Server Action ref (plan.md Phase 3's `loadMoreClassesAction`). */
  onLoadMore: (
    academicYear: string,
    cursor: string,
  ) => Promise<LoadMoreResult>;
}
```

Matches plan.md §0/Phase 4 exactly (`Class`/`ClassManagementFailure` are
`domain/entities` + `domain/failures` types — both legal presentation
imports). `ClassListPage`/`LoadMoreResult` are named here rather than inlined
so `actions.ts` (Phase 3) and this VM share one shape — `fe-nextjs-engineer`
should import these types from the `.i-vm.ts` file into `actions.ts`, not
redeclare them.

### 4.2 `PrincipalClassesScreen` (container) — takes `PrincipalClassesScreenProps` above, no separate prop interface needed (same shape).

**Internal state owned here** (hand-off note for `fe-state-engineer` — already
waived per plan.md §3, restated for the record):
- `classes: Class[]` — seeded `vm.classes`, appended on load-more success.
- `nextCursor: string | null`, `hasMore: boolean` — updated on load-more.
- `statusFilter: "ACTIVE" | "ARCHIVED" | "ALL"` — default `"ACTIVE"` (FR-003).
- `gradeFilter: number | "ALL"` — default `"ALL"`.
- `nameSearch: string` — default `""`.
- `sort: { key: "name" | "gradeLevel"; dir: "asc" | "desc" } | null` — default `null` (unsorted = insertion order).
- `loadingMore: boolean`, `loadMoreError: ClassManagementFailure["type"] | null`.
- Derived (not state): `visibleClasses = useMemo(() => deriveVisibleClasses(classes, { statusFilter, gradeFilter, nameSearch, sort }), [...])`.
- Derived (not state): `hasActiveFilter = statusFilter !== "ACTIVE" || gradeFilter !== "ALL" || nameSearch.trim() !== ""` (drives `ClassFiltersBar`'s clear-filters visibility AND which empty-state variant renders).

### 4.3 `derive-visible-classes.ts` (pure function, co-located, not exported outside the feature folder)

```ts
export interface ClassFilterState {
  statusFilter: "ACTIVE" | "ARCHIVED" | "ALL";
  gradeFilter: number | "ALL";
  nameSearch: string;
  sort: { key: "name" | "gradeLevel"; dir: "asc" | "desc" } | null;
}

export function deriveVisibleClasses(
  classes: Class[],
  state: ClassFilterState,
): Class[];
```
Order of operations (AC-1.13 AND semantics): filter by status → filter by
grade → filter by case-insensitive name substring → sort (if `sort !== null`).
Vietnamese collation: reuse `localeCompare(b, "vi")` precedent from
`principal-teachers-screen.tsx:71` for the `"name"` sort key.

### 4.4 `ClassFiltersBar`

```ts
export interface ClassGradeOption {
  value: number;
  label: string; // already-translated, e.g. t("gradeN", { n: value })
}

export interface ClassFiltersBarProps {
  statusFilter: "ACTIVE" | "ARCHIVED" | "ALL";
  gradeFilter: number | "ALL";
  nameSearch: string;
  gradeOptions: ClassGradeOption[];
  sort: { key: "name" | "gradeLevel"; dir: "asc" | "desc" } | null;
  hasActiveFilter: boolean;
  onStatusChange: (v: "ACTIVE" | "ARCHIVED" | "ALL") => void;
  onGradeChange: (v: number | "ALL") => void;
  onNameSearchChange: (v: string) => void;
  onSortChange: (v: { key: "name" | "gradeLevel"; dir: "asc" | "desc" } | null) => void;
  onClearFilters: () => void;
  /** Already-translated strings — presentation owns i18n per rule, this component is a pure prop-in/event-out leaf. */
  labels: {
    statusLabel: string;
    statusOptions: { active: string; archived: string; all: string };
    gradeLabel: string; allGradesLabel: string;
    searchPlaceholder: string; searchAriaLabel: string;
    sortLabel: string; sortByName: string; sortByGrade: string;
    sortAscAriaLabel: string; sortDescAriaLabel: string;
    clearFiltersLabel: string;
  };
}
```
Mirrors `PLFilterBarProps`'s pattern (all copy pre-translated, all state
controlled). Sort control: a 2nd `Select` (key: name|gradeLevel) + a
toggle `Button` (icon-only, asc/desc) — reuses `ui/select` + `ui/button`
exactly as `class-management-screen.tsx`'s grade filter does; no new
primitive.

### 4.5 `ClassesTable` (≥768px)

```ts
export interface ClassesTableProps {
  classes: Class[];
  homeroomUnassignedLabel: string;
  statusLabels: Record<ClassStatus, string>;
  columnLabels: {
    name: string; gradeLevel: string; homeroom: string;
    studentCount: string; status: string; caption: string;
  };
  gradeLabel: (n: number) => string; // t("gradeN", { n })
}
```
No callbacks — table is read-only (FR-009). `STATUS_TONE` constant
(`Record<ClassStatus, StatusTone>`, `{ ACTIVE: "success", ARCHIVED: "muted" }`)
lives inline in this file, mirroring `principal-teachers-screen.tsx`'s
`STATUS_TONE` pattern — not a new component, not exported.

### 4.6 `ClassesCardList` (<768px)

```ts
export interface ClassesCardListProps {
  classes: Class[];
  homeroomUnassignedLabel: string;
  statusLabels: Record<ClassStatus, string>;
  fieldLabels: {
    gradeLevel: string; homeroom: string; studentCount: string;
  };
  gradeLabel: (n: number) => string;
}
```
Same data, same `STATUS_TONE` map (shared const, not duplicated — both table
and card import it from a co-located `class-status-tone.ts`, see §5).

### 4.7 `ClassesEmptyState`

```ts
export interface ClassesEmptyStateProps {
  variant: "zero-tenant" | "zero-filtered";
  message: string; // pre-translated, differs per variant
  clearFiltersLabel?: string; // only rendered when variant === "zero-filtered"
  onClearFilters?: () => void;
}
```
`variant === "zero-tenant"` → no clear-filters button (AC-1.4).
`variant === "zero-filtered"` → clear-filters button required (AC-1.5).
Screen computes `variant` from `hasActiveFilter && visibleClasses.length === 0`
vs. `classes.length === 0`.

### 4.8 `ClassesErrorState`

```ts
export interface ClassesErrorStateProps {
  variant: "network" | "forbidden";
  message: string; // pre-translated per variant
  retryLabel?: string; // only rendered when variant === "network"
  onRetry?: () => void; // router.refresh(), mirrors principal-teachers-screen.tsx precedent
}
```
`variant === "forbidden"` → NO retry control at all (403 is not retryable,
AC-1.7) — this is a structural prop absence, not a disabled button, so it
can't be tab-focused into a dead end (a11y).

### 4.9 `ClassesLoadingSkeleton`

```ts
export interface ClassesLoadingSkeletonProps {
  variant: "table" | "card";
  rowCount?: number; // default 4, mirrors LoadingRows() precedent
  loadingAnnouncement: string; // sr-only role="status" text
}
```
Table variant reuses `ui/table` + `ui/skeleton` exactly like
`principal-teachers-screen.tsx`'s `LoadingRows()`; card variant is `rowCount`
stacked `Skeleton` blocks sized to the card layout (§6 Q2).

### 4.10 `ViewTeachersCta` (Could-have, FR-010)

```ts
export interface ViewTeachersCtaProps {
  label: string;
  href: string; // `(app)/principal/teachers` route, built by the RSC page/screen, not hardcoded here
}
```
Rendered by `next/link` `Link` — visible ONLY when the screen is in the
success branch (AC-2.1) — the screen decides visibility by where in the JSX
tree it mounts this component (conditionally rendered alongside
`ClassesScreenHeader`, not inside it, so loading/error/empty branches never
mount it).

## 5. Composition & Variant Strategy

- **`StatusBadge` `tone` prop** already covers every status this screen needs
  (`success` for `ACTIVE`, `muted` for `ARCHIVED`) — no `cva` variant work
  needed, no new tone. `STATUS_TONE: Record<ClassStatus, StatusTone>` const
  lives in a small co-located `class-status-tone.ts` (not a component) so
  `ClassesTable` and `ClassesCardList` both import the same map instead of
  each redeclaring it (avoids the literal duplication the `component-
  organization.md` "status styling lặp inline" smell warns against, even
  though this is a const, not a component).
- **No `asChild`/`Slot` composition needed** — none of these components wrap
  arbitrary children; all are closed, prop-driven leaves. `ViewTeachersCta` is
  the only one with a navigational role and uses `next/link`'s `Link`
  directly (existing precedent across the app), not a `Button asChild` unless
  `fe-nextjs-engineer` prefers matching Button's visual style — either is
  fine, note as an implementation-level styling choice, not an architecture
  one.
- **`ClassFiltersBar`'s sort control** is a `Select` (key) + icon `Button`
  (direction toggle), NOT a `cva`-variant sortable-column-header pattern
  (clicking table headers to sort) — chosen because the SAME sort control
  must work identically for both the table (≥768px) and card list (<768px)
  variants; a table-header-click sort wouldn't exist on mobile, forcing two
  divergent sort UIs. One control, two render targets.
- **Extension point, not over-abstracted:** `ClassesTable`/`ClassesCardList`
  are NOT merged into one "responsive polymorphic list" component. Precedent
  (`principal-teachers-screen.tsx`) doesn't have a card variant to compare
  against, and inventing a generic responsive-table-or-cards abstraction for
  a single consumer would be exactly the premature abstraction
  `component-organization.md`'s "3+ instances" guidance warns against. Keep
  them as two sibling presentational components switched by the screen via
  a CSS-breakpoint-driven `hidden md:block` / `block md:hidden` pair (same
  technique implied by NFR-002's "table→card" language) — NOT a JS
  `useMediaQuery` conditional-render (avoids SSR/hydration mismatch; both
  render, CSS hides the inactive one — reuses whatever breakpoint utility
  convention the codebase already uses for other table/card responsive
  pairs, `fe-nextjs-engineer` to confirm the existing Tailwind breakpoint
  token, likely `md:` per NFR-002's "768" threshold).

## 6. Open-question resolutions

### Q1 — `ARCHIVED` badge tone: **CONFIRM `muted`.**
Not just a convention match (`schedule: done → muted`) as plan.md's §6 framed
it defensively — this is a **direct same-entity precedent**:
`class-management-screen.tsx:252-256` already renders this EXACT `Class`
entity's `status` field with `tone={c.status === "ACTIVE" ? "success" :
"muted"}`. Two screens rendering the same entity's same enum with different
tones would itself be a design-system inconsistency worth flagging — `muted`
is not just acceptable, it is the one that keeps the two `Class`-status
renderings visually consistent app-wide. No ADR needed (reuses an existing
token/tone, no new one minted). Resolved — do not re-litigate at design-review
unless a `/uiux` pass explicitly wants to differentiate the two screens on
purpose.

### Q2 — Mobile card layout (<768px): **stacked, single-column.**
Layout, top to bottom per card:
```
┌─────────────────────────────────────┐
│ {name}                    [Badge]   │  ← card title (font-semibold) + status badge, same row
│ {gradeLabel(gradeLevel)}            │  ← caption-size, muted-foreground
│ ────────────────────────────────    │  ← thin divider (border-border)
│ {homeroomLabel}: {homeroomTeacher-  │  ← label:value pairs, stacked
│   Name ?? unassignedPlaceholder}     │
│ {studentCountLabel}: {studentCount} │
└─────────────────────────────────────┘
```
**Reasoning for stacked over two-column label/value grid:**
- Field set is short (4 data fields + status) and each value is short
  (numbers, short teacher names) — a 2-column grid buys little density here
  vs. a personal-dashboard stat grid (like `StatCard`) where 2-column pays off
  with more fields.
- Stacked matches the existing card-list precedent in spirit
  (`docs/product/design-system.md` doesn't define a 2-column list-card
  pattern anywhere in the inventoried patterns — `StatCard` is a single-stat
  tile, not a multi-field record card; there's no precedent to diverge from,
  so default to the simpler, more robust-at-320px layout).
- Stacked never risks label/value column misalignment or truncation at
  320px (NFR-002's hard floor) — a 2-column grid with a long class name or
  long teacher name is the more likely a11y/overflow risk at that width.
- Status badge placed top-right of the title row (not buried at the bottom)
  so it's the first thing scanned, consistent with how the table puts status
  in a dedicated, visually prominent column.
- Card is a `<div role="group" aria-label="{name}, {status label}">` (not a
  nested-interactive `<button>`/`<a>` — this list has no drill-down per
  FR-012, so no "stretched-link" pattern is needed here, unlike the LMS
  lesson-player precedent noted in earlier memory).

## 7. State ownership summary (hand-off to `fe-state-engineer` — confirmed not needed as separate pass)

All state is `PrincipalClassesScreen`-local `useState`/`useMemo` per plan.md
§3's verdict — restated here at the contract level for completeness, no
changes to that verdict:

| State | Owner | Type |
| --- | --- | --- |
| `classes`, `nextCursor`, `hasMore` | `PrincipalClassesScreen` (seeded from VM, mutated on load-more) | local `useState` |
| `statusFilter`, `gradeFilter`, `nameSearch`, `sort` | `PrincipalClassesScreen` | local `useState`, passed down as **controlled props** to `ClassFiltersBar` |
| `loadingMore`, `loadMoreError` | `PrincipalClassesScreen` | local `useState`, passed to `LoadMoreButton` (shared) via its `hasError`/`isLoadingMore`/`onLoadMore`/`label`/`errorLabel` props |
| `visibleClasses`, `hasActiveFilter` | derived, not stored | `useMemo` |
| Everything else (`ClassFiltersBar`, `ClassesTable`, `ClassesCardList`, `ClassesEmptyState`, `ClassesErrorState`, `ClassesLoadingSkeleton`, `ViewTeachersCta`) | none — fully controlled | no internal state |

No global store, no TanStack Query — confirmed, no divergence from plan.md.

## 8. Accessibility contract (WCAG 2.1 AA, per interactive node)

| Node | Role/label | Keyboard |
| --- | --- | --- |
| Status `Select` | native trigger has `aria-label` = `labels.statusLabel` (Radix `SelectTrigger`, no visible `<label>` needed if `aria-label` present, matches `class-management-screen.tsx` convention of a visible `<label htmlFor>` OR `pl-filter-bar.tsx`'s `aria-label`-only convention — architect defers exact choice to whichever the `principalClasses` i18n key set makes more natural, both are AA-compliant) | Tab to trigger, Enter/Space opens, Arrow keys select, Esc closes |
| Grade `Select` | `aria-label` = `labels.gradeLabel` | same as above |
| Name search `Input` | `type="search"`, `aria-label` = `labels.searchAriaLabel`, visible placeholder is NOT a substitute for the aria-label (placeholder text disappears on input) | Tab to focus, native text input |
| Sort key `Select` + direction `Button` | `aria-label` = `labels.sortAscAriaLabel`/`sortDescAriaLabel` on the direction toggle (icon-only button — MUST have `aria-label`, icon alone is not accessible per `accessibility.md` "icon-only button có aria-label") | Tab-reachable, Enter/Space toggles |
| Clear-filters `Button` | visible text label (`clearFiltersLabel`), not icon-only | Tab-reachable, Enter/Space activates |
| Table | `<Table aria-label={columnLabels.caption}>` or `<TableCaption className="sr-only">`, matching the two existing precedents' slightly different conventions — pick `TableCaption` (principal-teachers' choice) for consistency within the `principal` feature namespace | n/a (not focusable itself; rows/cells are plain text, no per-row interactive control since FR-009 forbids mutation) |
| Loading skeleton | `aria-busy={true}` on the table/card container + `role="status"` sr-only announcement text (`loadingAnnouncement`), exact precedent from `principal-teachers-screen.tsx:114-122` | n/a, not focusable |
| Empty state | `role="status"` on the message (non-urgent, matches `principal-teachers-screen.tsx`'s `table.noTeachers` pattern), clear-filters `Button` (when present) is a normal focusable, labeled button | Tab-reachable when present |
| Error state (network) | `role="alert"` on the message container (urgent, matches `principal-teachers-screen.tsx:88`), retry `Button` visible-text-labeled | Tab-reachable |
| Error state (forbidden) | `role="alert"` on the message container, **no retry button rendered at all** (not disabled — absent, so it's never a confusing dead focus stop) | n/a |
| `LoadMoreButton` (shared) | Already accessible per its existing implementation — `aria-busy` while loading, `disabled` guard, unmounts (not disables) when `!hasMore`. This screen must supply pre-translated `label`/`errorLabel` strings per its existing prop contract. | Tab-reachable, Enter/Space activates |
| Card (mobile) | `role="group"` with a composed `aria-label` (`"{name}, {status label}"`) so a screen-reader user gets row identity without drilling into each stacked line individually | Not itself focusable (no interactive card-wide affordance per FR-012's no-drill-down); internal text is plain, not tab-stops |
| `ViewTeachersCta` | Rendered as `next/link` `Link` with visible text label (not icon-only) | Tab-reachable, Enter activates navigation |

**Touch targets:** every `Button`/`SelectTrigger`/`Link` in this tree must
resolve to ≥44×44px on mobile viewports — reuse whichever `ui/button` `size`
variant the two precedent screens already use to satisfy this (`size="sm"`
buttons noted in `principal-teachers-screen.tsx` render at desktop-only
contexts; confirm `size="default"` or larger is used for anything visible at
<768px, e.g. `LoadMoreButton`'s default `Button` sizing already meets this per
its existing usage in `notifications-center`).

**Contrast:** all copy uses `text-foreground`/`text-muted-foreground` per
existing precedent; error copy MUST use `text-edu-error-text` (not
`text-destructive`) per `design-system.md`'s ADR-0049 contrast rule —
`principal-teachers-screen.tsx:89` already does this correctly (`text-edu-
error-text`), mirror it exactly, do not introduce `text-destructive` for text.

**Motion:** none needed — no new animation introduced by this screen beyond
whatever `ui/skeleton`'s existing pulse animation already does (already
motion-safe-gated at the primitive level).

## 9. Summary of deltas vs. `plan.md`

1. **`LoadMoreButton` → reuse `components/shared/load-more-button/` as-is.**
   Plan.md's premise that no shared load-more precedent exists is stale;
   `fe-nextjs-engineer` should import it directly, not build a new one.
   (Flagged to `fe-lead`: also flag the `audit-log` feature-local duplicate
   as an unrelated backlog cleanup item.)
2. **`ClassFiltersBar` confirmed feature-local** — no promotion warranted,
   consistent with every other filter-bar in the codebase.
3. **Q1 (ARCHIVED tone) confirmed `muted`** with a stronger same-entity
   precedent than plan.md cited.
4. **Q2 (card layout) resolved: stacked single-column**, concrete field
   order + reasoning above.
5. Added the `deriveVisibleClasses()` pure-function contract (plan.md named
   it but didn't specify its signature) and `ClassFilterState`/`ClassGradeOption`
   supporting types.
6. Full a11y contract per interactive node (plan.md deferred this to
   `fe-component-architect`, now delivered).
