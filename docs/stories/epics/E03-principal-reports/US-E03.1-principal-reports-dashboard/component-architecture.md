# US-E03.1 Component Architecture (fe-component-architect)

Refines plan.md Phase 4 + spec.md §5 into component tree, `.i-vm.ts` contract,
per-component prop interfaces, composition, and a11y. State mechanics
(TanStack Query key hierarchy, race/discard, poll interval/backoff,
`termId`-as-URL-param decision) are `fe-state-engineer`'s to detail against
the container boundary defined below — mirrors the `AuditLogScreen`
(US-E12.12) container/presentational split, the closest precedent in this
codebase for a query-owning screen with region-scoped status.

## 1. Architecture Summary

- **Scope**: 1 screen (`ReportsScreen`), 4 independently-stated regions (stat
  grid, subject chart, attendance chart, reports table), a toolbar (term
  radiogroup + refresh + export), and the reports-table header's "New report"
  action (plan.md D-4 — NOT in the toolbar).
- **New components**: `ReportsScreen` (container), `ReportsToolbar`,
  `TermRadioGroup`, `StatGridRegion`, `SubjectAverageChartRegion` +
  `SubjectAverageChart`, `AttendanceTrendChartRegion` + `AttendanceTrendChart`,
  `PeriodicReportsTableRegion` + `PeriodicReportsTable` + `NewReportButton`,
  2 skeleton leaves (`ChartSkeleton`, `TableRowSkeleton`), 2 reused-shape
  leaves (`RegionErrorState`, `RegionEmptyState`) — all feature-local
  (single screen today, per decision tree row 3).
- **Reused as-is (canonical, unmodified)**: `StatCard`, `StatusBadge`,
  `StatCardSkeletonGrid` (exact fit for the stat-grid loading state —
  no new skeleton needed there), `Skeleton` (ui primitive, base for the two
  new feature-local skeleton leaves), `Button`.
- **Primitive needing a variant addition (flag to `fe-nextjs-engineer`, not a
  new component)**: `components/ui/radio-group/` — design-spec's
  `toolbar.termRadioGroup` is a segmented-pill toggle (active = filled
  `bg-primary`/white text), not the existing circle-indicator radio look.
  Correct fix per `component-organization.md` row 1 is a `variant="segmented"`
  on `RadioGroup`/`RadioGroupItem` (Radix already exposes `data-state` for
  style targeting — no new ARIA needed, ROOT stays `role=radiogroup` native).
  See §6.
- **Component-organization.md gap found (flag to `fe-lead`, not fixed here)**:
  no app-wide shared "scoped error + retry" / "scoped empty state" component
  exists despite the pattern being hand-duplicated locally in ~20+ screens
  (`teacher-classes-screen`, `academic-record-screen`, `staff-leave-screen`,
  `notifications-center`, `audit-log-screen`, `discipline-screen`, …) —
  `US-E12.12`'s own architect note already flagged this same gap and elected
  to stay feature-local ("no shared EmptyState/ErrorState exists yet…
  feature-local"). This story follows the same established precedent
  (`RegionErrorState`/`RegionEmptyState`, feature-local, reused 3–4× WITHIN
  this screen only) rather than unilaterally promoting a cross-cutting
  component outside this story's scope — but the duplication count is now
  high enough that `fe-lead` should consider scheduling a dedicated
  promotion story.
- **No chart library** (plan.md D-2, confirmed) — both charts are div-based,
  tokens-only fills, `role="img"` + computed `aria-label`, every value also
  rendered as visible text (never chart-only), low-attendance weeks flagged by
  BOTH color and a distinct (bold + AA-safe warning-tinted) label style.

## 2. Reuse scan (grepped `components/ui`, `components/shared`, `features/*/presentation` before proposing anything new)

| Need | Found | Decision |
| --- | --- | --- |
| Stat card | `components/shared/stat-card` (`StatCard`, `StatTone`, default variant: `label,value,icon,tone,trend?`) | **reuse as-is** — confirmed canonical by design-spec `statGrid.component` |
| Stat grid loading skeleton | `components/shared/stat-card-skeleton` (`StatCardSkeletonGrid`, props `count,srLabel,className,announce`) | **reuse as-is, exact fit** for `states.loading` (cards variant, count 4) — no new skeleton component needed for this region |
| Status badge (ready/generating) | `components/shared/status-badge` (`StatusBadge`, `StatusTone` incl. `success`/`warning`) | **reuse as-is** — do not invent a new badge (decision `0026`) |
| Radiogroup primitive | `components/ui/radio-group` (Radix `RadioGroup`/`RadioGroupItem`, native `role=radiogroup`/`role=radio`, built-in arrow-key nav + focus ring) | **reuse, but needs a `variant="segmented"` addition** — visual look in design-spec is a segmented pill, not the default circle indicator (see §1, §6). Flag to `fe-nextjs-engineer`; NOT a new component. |
| Chart-shaped skeleton | Searched `components/shared` — none exists (only `stat-card-skeleton`, cards-shaped). Task brief assumed an "EduSkeleton" shared component with a chart variant; **it does not exist in `src/` as a shared component** — `EduSkeleton`/`EduError`/`EduEmpty` in `design_src/edu/states.jsx` are mockup-only demo primitives, never ported to `src/components/shared/`. | Build `ChartSkeleton` feature-local (from `components/ui/skeleton` primitive) — mirrors how `discipline-screen` built its own feature-local `TableRowSkeleton` from the same base primitive rather than waiting on a shared one. |
| Table-rows skeleton | `discipline-screen/components/table-row-skeleton.tsx` (feature-local, from `ui/skeleton`) | pattern reused conceptually; this feature's `TableRowSkeleton` follows the same convention, stays feature-local (single screen) |
| Scoped error+retry / empty state | No shared component (see §1 gap); feature-local pattern already established by `audit-log-screen` (`ErrorBanner`, `EmptyState`) and `notifications-center` (`ErrorState`, `EmptyState`) | Build `RegionErrorState`/`RegionEmptyState` feature-local, parameterized (icon/title/desc/onRetry), reused 3–4× **within this screen** |
| Div-based chart | none exists anywhere in `src/` (first chart-shaped component in the app) | net-new, feature-local: `SubjectAverageChart`, `AttendanceTrendChart` — pure presentational, typed data props, tokens-only fills |
| Table | `components/ui/table` + established pattern (`academic-record-seal-screen/components/audit-trail-table.tsx`, `audit-log-screen/components/log-table.tsx`) | reuse `ui/table` primitives; `PeriodicReportsTable` follows the same "heading outside table, `scope=col`, no bundled loading/error state" convention |
| Button | `components/ui/button` (variants: primary/secondary/ghost, `size="sm"`, icon slot) | reuse as-is for Refresh (secondary), Export Excel (primary), New report (ghost) |

No missing shadcn primitives beyond the `radio-group` variant note above —
`table`, `skeleton`, `badge`, `button`, `radio-group` all already exist under
`components/ui/`. No `bun ui:add` needed.

## 3. Component tree

```
page.tsx (RSC, principal/reports/page.tsx — behind Phase 3's guard layout)
│   builds ReportsScreenVM: initialTerm (server-resolved default term) +
│   5 Server Action refs (bootstrap/di factories wrapped 'use server')
└── ReportsScreen ('use client', CONTAINER — features/principal/presentation/reports/)
    │   owns: term selection (controlled, seeded by vm.initialTerm), 4×
    │   TanStack Query (one per region, termId in key — fe-state-engineer),
    │   poll loop for "generating" rows (fe-state-engineer), refresh/export/
    │   new-report handlers; derives each region's own
    │   loading|error|empty|success status — NOT one global screen status
    │
    ├── ReportsToolbar                  (presentational, CONTROLLED)
    │   └── TermRadioGroup              (presentational, CONTROLLED — wraps ui/radio-group variant="segmented")
    ├── StatGridRegion                  (presentational — own status switch)
    │   ├── StatCardSkeletonGrid × 1    (reused shared, loading)
    │   ├── RegionErrorState            (error)
    │   └── StatCard × 4                (reused shared, success)
    ├── ChartsRow (layout-only div, no state)
    │   ├── SubjectAverageChartRegion   (presentational — own status switch)
    │   │   ├── ChartSkeleton           (loading)
    │   │   ├── RegionErrorState        (error)
    │   │   ├── RegionEmptyState        (empty — subjects: [])
    │   │   └── SubjectAverageChart     (success — pure div-chart, role=img)
    │   └── AttendanceTrendChartRegion  (presentational — own status switch)
    │       ├── ChartSkeleton           (loading)
    │       ├── RegionErrorState        (error)
    │       ├── RegionEmptyState        (empty — weeks: [])
    │       └── AttendanceTrendChart    (success — pure div-chart, role=img)
    └── PeriodicReportsTableRegion      (presentational — own status switch)
        ├── header: title + NewReportButton  (ghost, icon Plus — D-4, in table header not toolbar)
        ├── TableRowSkeleton × 5        (loading)
        ├── RegionErrorState            (error)
        ├── RegionEmptyState            (empty — reports: [] for this term)
        └── PeriodicReportsTable        (success — pure list renderer)
            └── StatusBadge per row     (reused shared — ready=success/generating=warning)
```

Container/presentational split:
- **`ReportsScreen`** is the ONLY component that touches TanStack Query, the
  Server Action refs, and the poll loop — matches `AuditLogScreen`'s role.
  Everything below it is **props-in, callbacks-out**; no region component
  imports a query hook or assumes a `useQuery` result shape, so every region
  is independently story-testable in Storybook without a `QueryClient`
  (explicit requirement from the brief).
- Each of the 4 regions receives its OWN `status`/`data`/`errorKey`/`onRetry`
  — this is the key structural difference from `AuditLogScreen` (single
  status for one list) and from `DisciplineScreen` (single `isLoading`
  boolean for the whole screen): FR-003's "term change syncs all 4, but a
  failed region doesn't take down the other 3" (AC-01.3) requires 4
  independent status props, not 1.
- Presentational leaves may call `useTranslations` directly for their own
  static copy (mirrors `LogRow`/`ExamBankFilterBar` convention) — `errorKey`
  translation happens inside `RegionErrorState` (`t(\`errors.${errorKey}\`)`),
  never at the container or a server boundary (i18n.md boundary rule).

## 4. Placement (decision tree per `component-organization.md`)

| Component | Home | Rationale |
| --- | --- | --- |
| `ReportsScreen` | `features/principal/presentation/reports/reports-screen.tsx` | screen container, single-feature |
| `ReportsToolbar`, `TermRadioGroup`, `StatGridRegion`, `SubjectAverageChartRegion`, `SubjectAverageChart`, `AttendanceTrendChartRegion`, `AttendanceTrendChart`, `PeriodicReportsTableRegion`, `PeriodicReportsTable`, `NewReportButton`, `ChartSkeleton`, `TableRowSkeleton`, `RegionErrorState`, `RegionEmptyState` | `features/principal/presentation/reports/components/*.tsx` | composed, single-screen today → feature-local per decision-tree row 3; **promote `RegionErrorState`/`RegionEmptyState` (and the sibling pattern already duplicated in ~20 other screens) to `components/shared/` the next time `fe-lead` schedules that consolidation** — not this story's job to do unilaterally |
| `StatCard`, `StatCardSkeletonGrid`, `StatusBadge` | `components/shared/*` (existing) | reused unmodified |
| `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Skeleton`, `Button`, `RadioGroup`/`RadioGroupItem` | `components/ui/*` (existing) | reused primitives; `radio-group` gets a **variant addition**, not a fork (edit in place, per row 1 of the decision tree) |

## 5. ViewModel — `reports-screen.i-vm.ts`

```ts
import type { Term } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { ReportsSummaryEntity } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";

/** Uniform Server Action result shape — mirrors AuditLogScreenVM's
 *  ActionResult convention (US-E12.12) so TanStack Query's queryFn can
 *  branch ok/fail without a try/catch around every call site. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorKey: PrincipalReportsFailure["type"] };

/** Server → client boundary contract for ReportsScreen (US-E03.1).
 *  No RSC-side data prefetch is required here (unlike AuditLogScreen) —
 *  every one of the 4 regions needs real client-side loading/error/empty/
 *  success + term-driven re-fetch + race-discard (FR-003), so all 5 data
 *  needs are fetched client-side through Server Action refs from first
 *  mount. `page.tsx` only resolves `initialTerm` server-side (cheap,
 *  synchronous default — see field doc) and wires the 5 action refs. */
export interface ReportsScreenVM {
  /** BE-resolved current/active term, or the "HK2" [ASSUMPTION] fallback
   *  (spec.md §8) if unresolvable — seeds ReportsScreen's controlled `term`
   *  state so the radiogroup shows a pre-selection with no client-side flash
   *  (AC-01.2). Read once at mount; never re-derived after. */
  initialTerm: Term;

  /** One Server Action ref per region query. TanStack Query's `queryFn`
   *  calls these directly (mirrors AuditLogScreenVM.getAuditLogAction) —
   *  region independence (FR-003) comes from 4 separate query keys sharing
   *  `termId`, not from 4 separate VM shapes; grouped here by region purely
   *  for readability. */
  getReportsSummaryAction: (
    termId: Term,
  ) => Promise<ActionResult<ReportsSummaryEntity>>;
  getSubjectAveragesAction: (
    termId: Term,
  ) => Promise<ActionResult<SubjectAverageEntity[]>>;
  getAttendanceTrendAction: (
    termId: Term,
  ) => Promise<ActionResult<AttendanceTrendPointEntity[]>>;
  getPeriodicReportsAction: (
    termId: Term,
  ) => Promise<ActionResult<ReportListItemEntity[]>>;

  /** Should (FR-008). Table region appends the returned row on success
   *  (`status: "generating"`); adds nothing on failure (AC-07.2/07.3) — the
   *  no-ghost-row rule is enforced by ReportsScreen's mutation handler, not
   *  by this contract, but the field exists so that enforcement is possible. */
  generateReportAction: (
    termId: Term,
  ) => Promise<ActionResult<ReportListItemEntity>>;

  /** Should (FR-009), scope open per plan.md D-3. OPTIONAL and OMITTED
   *  entirely (not just disabled) from the toolbar when undefined — keeps
   *  this Should decision from blocking the Must-priority contract; do not
   *  render a dead "Export Excel" button if this is absent. */
  exportExcelAction?: (termId: Term) => Promise<ActionResult<Blob>>;
}

export type {
  Term,
  ReportsSummaryEntity,
  SubjectAverageEntity,
  AttendanceTrendPointEntity,
  ReportListItemEntity,
};
```

Notes for `fe-state-engineer` (hand-off):
- Query keys: `["principal", "reports", "summary", term]`,
  `["...", "subject-averages", term]`, `["...", "attendance-trend", term]`,
  `["...", "periodic-reports", term]` — `term` in every key gives TanStack
  Query's own stale-request handling for AC-01.4 (race discard) for free;
  confirm before hand-rolling a race guard (plan.md §3 already flags this).
- `ReportsScreen` derives each region's `status` from that region's query
  state independently: `queryError → "error"`; `isLoading (no data yet) →
  "loading"`; (chart/table only) `data.length === 0 && !isLoading → "empty"`;
  else `"success"`. Stat grid has no `"empty"` branch (FR-004 — always 4
  cards once resolved).
- `isRefreshing` (passed to `ReportsToolbar`) = OR of all 4 queries'
  `isFetching` (excluding the very first load) — one combined flag drives
  the single Refresh button's `aria-busy` (FR-010 AC-05.4); `onRetry` per
  region, by contrast, only refetches THAT region's query (AC-01.3/04.5).
- Polling (NFR-004): conditional `refetchInterval` on the periodic-reports
  query only, active while `reports.some(r => r.status === "generating")`;
  numeric interval/backoff left open (spec §8, item 2).

## 6. Prop interfaces (per component)

### `ReportsScreen` (container — external prop shape from the RSC page)

```ts
export type ReportsScreenProps = ReportsScreenVM;
```

### `ReportsToolbar`

```ts
// components/reports-toolbar.tsx
export interface ReportsToolbarProps {
  term: Term;
  onTermChange: (term: Term) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  /** Omit the whole Export Excel button (not disable it) when undefined —
   *  mirrors ReportsScreenVM.exportExcelAction's optionality (D-3). */
  onExportExcel?: () => void;
  isExporting?: boolean;
}
```

Renders `TermRadioGroup` + secondary "Làm mới" (icon `RefreshCw`,
`aria-busy={isRefreshing}`, disabled while `isRefreshing` per AC-05.4) +
primary "Xuất Excel" (icon `Download`, only if `onExportExcel` is defined).

### `TermRadioGroup`

```ts
// components/term-radio-group.tsx
export interface TermRadioGroupProps {
  value: Term;
  onValueChange: (term: Term) => void;
}
```

Wraps `ui/radio-group`'s `RadioGroup`/`RadioGroupItem` with the new
`variant="segmented"` (§1/§7) — 3 fixed `RadioGroupItem`s (`"HK1"`, `"HK2"`,
`"FULL_YEAR"`), labels from `toolbar.termOptions.{hk1,hk2,fullYear}`,
`RadioGroup aria-label={t("toolbar.termRadioGroupAriaLabel")}`. Keyboard
arrow-nav + focus ring inherited from Radix (AC-01.6) — no hand-rolled ARIA.

### `StatGridRegion`

```ts
// components/stat-grid-region.tsx
export type StatGridStatus = "loading" | "error" | "success"; // no "empty" — FR-004

export interface StatGridRegionProps {
  status: StatGridStatus;
  data: ReportsSummaryEntity | null;
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
}
```

- `loading` → `<StatCardSkeletonGrid count={4} srLabel={...} announce />`
  (this region announces its own status — no shared "one status region for
  the whole screen" here, unlike `DisciplineScreen`, because FR-003 requires
  4 INDEPENDENT loading announcements, not one).
- `error` → `<RegionErrorState errorKey={errorKey} onRetry={onRetry} />`.
- `success` → 4 `<StatCard variant="default" .../>`, tone mapping fixed per
  design-spec icon colors: total-students → `primary`, school-average →
  `success`, attendance-rate → `warning`, incidents → `error`. Trend prop
  passed **only when the entity's matching `*Trend` field is non-null**
  (FR-004 AC-04.2 — omit entirely, never render a misleading 0%):
  `entity.totalStudentsTrend != null ? { dir: entity.totalStudentsTrend >= 0 ? "up" : "down", value: \`${Math.abs(entity.totalStudentsTrend)}%\` } : undefined`.

### `SubjectAverageChartRegion` / `SubjectAverageChart`

```ts
// components/subject-average-chart-region.tsx
export type ChartRegionStatus = "loading" | "error" | "empty" | "success";

export interface SubjectAverageChartRegionProps {
  status: ChartRegionStatus;
  data: SubjectAverageEntity[];
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
}

// components/subject-average-chart.tsx — pure presentational leaf
export interface SubjectAverageChartProps {
  subjects: SubjectAverageEntity[];
  /** default 10 — "Thang điểm 10" per design-spec */
  maxScore?: number;
}
```

- `SubjectAverageChartRegion`: `loading` → `<ChartSkeleton />`; `error` →
  `RegionErrorState`; `empty` → `RegionEmptyState` (`subjects: []`, FR-005
  AC-02.3 — a dedicated empty state, never a rendering error); `success` →
  `<SubjectAverageChart subjects={data} />`.
- `SubjectAverageChart`: outer wrapper `role="img"` with an `aria-label`
  computed FROM `subjects` inside the component (e.g. summarizing subject
  count + min/max average — exact wording is `fe-nextjs-engineer`'s to
  finalize against `charts.subjectAverage.ariaLabel`, i18n.md boundary rule:
  translated at presentation, not passed in as a prop). One bar per subject:
  visible numeric label (`average.toFixed(1)`) ABOVE the bar, subject name
  label BELOW — every value is text, never chart-only (FR-005/NFR-001). Bar
  fill = tokens only (`bg-primary`/`bg-primary/60` gradient via Tailwind
  arbitrary gradient utility or a `background: var(--edu-primary)`-based CSS
  var — no raw hex).

### `AttendanceTrendChartRegion` / `AttendanceTrendChart`

```ts
// components/attendance-trend-chart-region.tsx
export interface AttendanceTrendChartRegionProps {
  status: ChartRegionStatus;
  data: AttendanceTrendPointEntity[];
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
}

// components/attendance-trend-chart.tsx — pure presentational leaf
export interface AttendanceTrendChartProps {
  weeks: AttendanceTrendPointEntity[];
  /** default 96 — INT-003/NFR-001 threshold; a 2nd, more-severe band is an
   *  OPEN QUESTION (spec §8, item 5) — do NOT hardcode a 2nd band without
   *  `ba-lead` confirmation; this prop stays single-threshold until then. */
  lowThreshold?: number;
}
```

- Same region-status shell as the subject chart (`empty` when `weeks: []`).
- `AttendanceTrendChart`: `role="img"` + computed `aria-label`. Per week:
  visible `"<rate>%"` label; **dual flag for `rate < lowThreshold`** (never
  color alone, NFR-001/AC-03.2):
  - bar fill: `bg-edu-warning` (else `bg-edu-success`) — token only;
  - label: `font-extrabold text-edu-warning-text` (else
    `font-semibold text-edu-text-secondary`) — `--edu-warning-text` (#9a6a0f,
    AA-safe on card bg per tokens.css) is the correct token here, NOT
    `--edu-warning-foreground` (that one is for text ON a warning-tinted
    background/badge, not a plain label on the card surface). The
    bold+color combination survives "verified with color simulated as
    removed" (AC-03.2) because the weight differs too.

### `PeriodicReportsTableRegion` / `PeriodicReportsTable` / `NewReportButton`

```ts
// components/periodic-reports-table-region.tsx
export type TableRegionStatus = "loading" | "error" | "empty" | "success";

export interface PeriodicReportsTableRegionProps {
  status: TableRegionStatus;
  reports: ReportListItemEntity[];
  errorKey: PrincipalReportsFailure["type"] | null;
  onRetry: () => void;
  onNewReport: () => void;
  /** Disables + `aria-busy`s NewReportButton while INT-005 is in flight
   *  (does NOT gate the table body's own status — a table region can be
   *  "success" while a new-report request is separately pending). */
  isGeneratingNewReport: boolean;
}

// components/periodic-reports-table.tsx — pure list renderer, success only
export interface PeriodicReportsTableProps {
  reports: ReportListItemEntity[];
  /** Download affordance detail is out of scope for this spec pass (FR-006
   *  only specifies the disabled-attribute gating, not the download
   *  mechanism itself) — optional, no-op default; wire a real handler once
   *  that's specified. Kept here so the contract doesn't block on it. */
  onDownload?: (report: ReportListItemEntity) => void;
}

// components/new-report-button.tsx
export interface NewReportButtonProps {
  onClick: () => void;
  isPending: boolean;
}
```

- `PeriodicReportsTableRegion` header ALWAYS renders (title +
  `NewReportButton`) regardless of body status — plan.md D-4: this button is
  structurally in the table region, never the toolbar, and is NOT hidden
  during the table's own loading/error/empty states (a principal can still
  request a new report while the list is empty or erroring).
- Body: `loading` → 5× `<TableRowSkeleton />`; `error` → `RegionErrorState`;
  `empty` → `RegionEmptyState` (FR-007 — visually/structurally distinct from
  loading/error, AC-04.7); `success` → `<PeriodicReportsTable reports={reports} />`.
- `PeriodicReportsTable`: 5 columns — name (`FileText` icon in a 32px tinted
  box + text), term (translated `table.columns.termLabels.{term}` — REUSE
  the same 3 labels as `toolbar.termOptions`, do not duplicate the copy under
  a second i18n key), createdAt (formatted via `useFormatter().dateTime`,
  matches `audit-trail-table.tsx`/`log-table.tsx` convention), status
  (`<StatusBadge tone={status === "ready" ? "success" : "warning"}>`), download
  (`<Button variant="ghost" size="sm" icon={Download} disabled={report.status !== "ready"}>` —
  `disabled` ATTRIBUTE, never opacity-only, per FR-006/NFR-001; automatically
  unreachable via Tab and re-enables the instant `status` flips to `"ready"`
  since it's a pure prop-derived boolean, not a separately-tracked flag).

### `RegionErrorState` (reused 4× within this screen)

```ts
// components/region-error-state.tsx
export interface RegionErrorStateProps {
  errorKey: PrincipalReportsFailure["type"];
  onRetry: () => void;
}
```

Translates `t(\`errors.${errorKey}\`)` inside the component (i18n boundary
rule — server/use-case never translates). `role="alert"` container (mirrors
`notifications-center.tsx`'s `ErrorState`/`audit-log-screen`'s `ErrorBanner`).

### `RegionEmptyState` (reused 3× — subject chart, attendance chart, table)

```ts
// components/region-empty-state.tsx
export interface RegionEmptyStateProps {
  icon: LucideIcon;
  titleKey: string; // e.g. "charts.subjectAverage.emptyTitle" — typed t() key
  descKey?: string;
}
```

Visually distinct from `RegionErrorState` (no `role="alert"`, neutral/muted
icon box vs the error's warning-tinted box, no retry action) and from the
loading skeleton (static content vs `motion-safe:animate-pulse`) — satisfies
AC-04.7's "no two of loading/empty/error visually identical" per region.

### `ChartSkeleton`

```ts
// components/chart-skeleton.tsx
export interface ChartSkeletonProps {
  /** bar count to render as placeholders — 8 for subjects, 6 for weeks */
  columnCount: number;
}
```

Built from the `ui/skeleton` primitive (`Skeleton` divs at varying heights in
a flex/grid row mirroring the real chart's column layout) — same "reuse the
base primitive, compose feature-local" move as `discipline-screen`'s
`TableRowSkeleton`. `role="status"` + `aria-busy` + `sr-only` label, own
live-region per region (not shared with a screen-wide one, per §3).

### `TableRowSkeleton`

```ts
// components/table-row-skeleton.tsx — no props; mirrors discipline-screen's version
export type TableRowSkeletonProps = Record<string, never>;
```

## 7. State ownership (contract level — hand-off to `fe-state-engineer`)

| State | Owner | Notes |
| --- | --- | --- |
| `term` selection | `ReportsScreen`, controlled, seeded by `vm.initialTerm` | drives all 4 query keys' `termId` param; `TermRadioGroup` receives it as a controlled prop, never holds its own copy — URL-param vs local-only is `fe-state-engineer`'s open call (plan.md §3/§4 item 3) |
| 4 regions' fetched data + status | TanStack Query, one key per region (`term` in the key) inside `ReportsScreen` | `fe-state-engineer` finalizes `getNextPageParam`-equivalent (none needed — single-page per region per spec §8 item 3) and the race-discard mechanism; regions only ever see the already-derived `status`/`data`/`errorKey` props (§5 notes) |
| `isRefreshing` (toolbar) | Derived in `ReportsScreen` from the 4 queries' `isFetching` (OR) | passed straight to `ReportsToolbarProps.isRefreshing` |
| Per-region `onRetry` | `ReportsScreen` — refetches ONLY that region's query | never a screen-wide retry; AC-01.3/04.5 require independence |
| Poll loop (generating rows) | `ReportsScreen`'s periodic-reports query (`refetchInterval` callback) | conditional on `reports.some(r => r.status === "generating")`; numeric interval/backoff left open (spec §8 item 2) |
| `isGeneratingNewReport` | Derived from the `generateReportAction` mutation's `isPending` in `ReportsScreen` | passed to `PeriodicReportsTableRegionProps`/`NewReportButtonProps.isPending` |
| Export Excel trigger + `isExporting` | Local UI state in `ReportsScreen` (button pending state), Should/D-3 | omit both the button and this state entirely if Phase 6 is descoped |

No Zustand/global store — matches plan.md and repo convention.

## 8. Composition & variant strategy

- **`RadioGroup`/`RadioGroupItem` variant addition** (flag to
  `fe-nextjs-engineer`, coordinate with `fe-lead` only if it's judged
  cross-cutting enough for an ADR — it is a pure visual variant of an
  existing primitive, so per `component-organization.md` row 1 this should
  NOT need a new token or ADR, just a `variant` prop and Tailwind classes
  keyed off Radix's built-in `data-state="checked"`): add
  `variant?: "default" | "segmented"` to both `RadioGroup` (container:
  `segmented` → `inline-flex gap-1 rounded-[var(--edu-radius-btn)] border border-border bg-card p-1`)
  and `RadioGroupItem` (`segmented` → renders its `children` as the visible
  label, hides the circle `Indicator`, uses
  `data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:font-bold`
  instead of the dot). This mirrors the already-established repo pattern
  (per architect memory) of adding a `variant` prop to ONE shared primitive
  for a visually-distinct instance rather than forking a component.
- **No new `cva` variants beyond that.** `StatCard`'s existing `tone` prop
  and `StatusBadge`'s existing `tone` prop cover every color this screen
  needs — no new tone value required.
- **No compound/slot pattern needed** — this is a straightforward
  toolbar+4-regions dashboard, not a primitive needing `asChild`/`Slot`.
- **Region status switch is intentionally a plain `if/else`/`switch`**
  inside each `*Region` component (not a generic `<StatusSwitch<T>>`
  abstraction) — 4 instances in ONE screen is exactly at the "3rd occurrence"
  threshold this repo uses elsewhere (`AuditLogResults`'s note, `component-
  organization.md`'s "don't abstract until 3+"); if `fe-nextjs-engineer` finds
  the 4 region switches are byte-for-byte identical modulo the child
  component, a small internal `<RegionShell status .../>` helper INSIDE this
  feature is fine, but it should stay feature-local, not become a new
  `components/shared/` generic (that decision needs a 2nd SCREEN using the
  same 4-way switch, not just 4 regions in one screen).
- **Extension point**: FR-009 (Export Excel) is fully optional at the VM
  boundary (`exportExcelAction?`) — if descoped, no component changes are
  needed elsewhere; if added later as a fast-follow, it plugs into
  `ReportsToolbar` without restructuring.

## 9. Accessibility contract

| Element | Requirement |
| --- | --- |
| `TermRadioGroup` | Native `role="radiogroup"` (Radix `RadioGroupPrimitive.Root`) with `aria-label`; 3 `role="radio"` children, arrow-key navigable, visible focus ring inherited from Radix — no custom ARIA needed even with the `segmented` visual variant (AC-01.6) |
| Refresh button | `aria-busy={isRefreshing}` + `disabled` while pending (not clickable again until resolution, AC-05.4); visible spinner icon swap is a decorative addition only, the `aria-busy` is the real signal |
| `SubjectAverageChart` / `AttendanceTrendChart` wrapper | `role="img"` + descriptive `aria-label` computed from the data (NFR-001); every bar ALSO carries a visible text label — never chart-only |
| Low-attendance weeks (`rate < 96`) | Flagged by BOTH bar-fill color (`bg-edu-warning`) AND a distinct label style (`font-extrabold text-edu-warning-text` vs `font-semibold text-edu-text-secondary`) — passes "verified even with color simulated as removed" (AC-03.2) because weight differs too |
| `StatusBadge` (ready/generating) | Icon+text, never color alone (already how `StatusBadge` is built — no change needed) |
| Download button | `disabled` ATTRIBUTE (not opacity/pointer-events alone) unless `status === "ready"` — unreachable via Tab while disabled, auto re-enables on status flip (FR-006/NFR-001) |
| `RegionErrorState` | `role="alert"` on the message container so screen readers announce it without focus; Retry is a real `<button type="button">` |
| `RegionEmptyState` | Static content, no special role beyond readable document order; visually distinct from both loading (`motion-safe:animate-pulse`) and error (`role="alert"`, warning-tinted icon box) per region — AC-04.7 |
| `NewReportButton` | Real `<button>`, `disabled` + `aria-busy` while `isPending`; ALWAYS present regardless of table body status (D-4) so it's never a dead tab-stop hidden behind loading/error |
| `ChartSkeleton` / `TableRowSkeleton` / `StatCardSkeletonGrid` | Each region's own `role="status"` + `aria-busy` + `sr-only` label — 4 independent live-region announcements (not one shared screen-wide region, unlike `DisciplineScreen`'s single-loading-block pattern), matching FR-003's per-region independence |
| Motion | All skeleton shimmer/pulse animation inherits `motion-safe:` gating from the `Skeleton` primitive — no new animation introduced |
| Route guard (Phase 3, not this doc's scope but adjacent) | Server-side redirect, zero client-side hide — already specified in plan.md, no component-level a11y implication beyond "the screen never partially renders for a non-principal role" |

## 10. Summary of flags for `fe-lead` / `fe-nextjs-engineer`

1. **Primitive variant needed**: `components/ui/radio-group/` needs
   `variant="segmented"` added (§6, §8) — no ADR expected (pure visual
   variant of an existing primitive, no new token), but flag so
   `fe-nextjs-engineer` doesn't skip it and hand-roll a fresh button-group
   instead of extending the existing Radix-backed primitive.
2. **No shared `EduSkeleton`/`EduError`/`EduEmpty` exists in `src/`** — the
   task brief's assumption that a shared `EduSkeleton` just needs a chart
   variant added does not hold; those names are `design_src/edu/states.jsx`
   mockup-only demo primitives, never ported to `components/shared/`. Built
   `ChartSkeleton`/`RegionErrorState`/`RegionEmptyState` feature-local instead,
   following the same precedent `US-E12.12`'s architect already established
   for the identical gap.
3. **Component-organization debt** (not this story's to fix, but now
   crossing the promotion bar): scoped error+retry / empty-state chrome is
   hand-duplicated in ~20+ screens across the codebase. Worth a dedicated
   consolidation story/ADR at `fe-lead`'s discretion.
4. **Two spec-level open items block finalizing chart contracts fully**:
   (a) a possible 2nd, more-severe attendance threshold band (spec §8 item 5
   — `AttendanceTrendChartProps.lowThreshold` stays single-band until
   `ba-lead` confirms); (b) FR-009 Export Excel scope (D-3 — VM field stays
   optional either way, no component blocked).
