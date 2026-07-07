# US-E12.12 Component Architecture (fe-component-architect)

Refines plan.md Phase 3's high-level tree. Scope: presentation layer only —
component tree, `.i-vm.ts` contract, prop interfaces, composition, a11y. State
mechanics (TanStack Query keys, URL search params, `useInfiniteQuery`) are
`fe-state-engineer`'s to detail against the container boundary defined below.

## 1. Reuse scan (done before proposing anything new)

Grepped `components/ui`, `components/shared`, `features/*/presentation`:

| Need | Found | Decision |
| --- | --- | --- |
| Table | `src/components/ui/table` + established usage pattern `academic-record-seal-screen/components/audit-trail-table.tsx` | **reuse as-is**, mirror that file's structure (heading `<h2>` outside table, `useFormatter().dateTime`, `Skeleton` rows) |
| Status/action badge | `src/components/shared/status-badge` (`StatusBadge`, `StatusTone`) | **reuse as-is** — do not invent a new badge (decision `0026`) |
| Filter bar shape (select + select + text input) | `exam-bank-filter-bar.tsx`, `lesson-bank-filter-bar.tsx` | pattern reused (single composed file, `Select`/`Input` primitives, sentinel `__all__` for "any"), **no shared `FilterBar` primitive exists to import** — every feature hand-rolls its own filter bar composed from `ui/select` + `ui/input`; audit-log's `FilterBar` follows the same convention, stays feature-local |
| Date range fields | `staff-leave-filters.tsx` has `dateFrom`/`dateTo` `<input type="date">` pair, but **no `from<=to` validation wired** (AC-12 requires this here — first occurrence) | no shared `DateRangeField` exists yet; build feature-local `DateRangeFields` with validation now; **promote to `components/shared/` the next time a 2nd screen needs from/to + validation** (flag left in memory) |
| Skeleton | `components/ui/skeleton` | reuse |
| Empty/Error state patterns | `notifications-center.tsx` (`EmptyState`, `ErrorState` inline sub-components, `role="alert"`/`role="log"`) | pattern reused conceptually; audit-log's are feature-local (single screen) |
| Load-more button | `notifications-center.tsx` `LoadMoreFooter` (no shared component exists) | feature-local, same convention |

No missing shadcn primitives — `table`, `select`, `input`, `skeleton`, `badge`, `button` all already exist under `components/ui/`. No `bun ui:add` needed.

## 2. Component tree

```
page.tsx (RSC, admin/audit-log/page.tsx)
│   requireRole via inherited AdminLayout guard (AC-11)
│   prefetch page 1 via makeGetAuditLogUseCase()
│   passes AuditLogScreenVM + getAuditLogAction ref as props
└── AuditLogScreen ('use client', CONTAINER — features/audit-log/presentation/audit-log-screen/)
    │   owns: URL-search-param filter state, useInfiniteQuery(["audit-log", filter])
    │   (fe-state-engineer detail); derives status ("loading"|"loading-more"|
    │   "error"|"empty"|"success") and flattens query pages → events[]
    │
    ├── ComplianceNotice          (presentational, static banner — AC-8/GDPR)
    ├── FilterBar                 (presentational, CONTROLLED — props only)
    │   └── DateRangeFields       (presentational, CONTROLLED — from/to + validation message)
    ├── AuditLogResults           (presentational — status switch, no own state)
    │   ├── LoadingSkeletonRows   (presentational, AC-1)
    │   ├── ErrorBanner           (presentational, AC-10 — has Retry button)
    │   ├── EmptyState            (presentational, AC-9)
    │   └── LogTable              (presentational, AC-2/AC-12)
    │       └── LogRow[]          (presentational leaf, AC-2/AC-8 — no edit/delete affordance)
    └── LoadMoreButton            (presentational, AC-7 — hidden when !hasMore)
```

Container/presentational split:
- **`AuditLogScreen`** is the ONLY component that touches TanStack Query / URL
  search params / the Server Action ref. Everything below it is pure
  props-in, callbacks-out — matches the `NotificationsCenterContainer` →
  `NotificationsCenterScreen` split (US-E10.2) and `ExamBankScreen`'s pattern.
- All leaves may call `useTranslations`/`useFormatter` directly (mirrors
  `audit-trail-table.tsx`, `ExamBankFilterBar`, `StaffLeaveFilters` — none of
  those inject a `labels` prop object; that pattern is reserved for
  cross-feature-promoted atomic leaves like `GenderBadge`). `AuditLogScreen`
  itself does not translate (it's the query-owning container, not a leaf).

## 3. Placement (decision tree per component-organization.md)

| Component | Home | Rationale |
| --- | --- | --- |
| `AuditLogScreen` | `features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx` | screen container, single-feature |
| `ComplianceNotice`, `FilterBar`, `DateRangeFields`, `AuditLogResults`, `LoadingSkeletonRows`, `ErrorBanner`, `EmptyState`, `LogTable`, `LogRow`, `LoadMoreButton` | `features/audit-log/presentation/audit-log-screen/components/*.tsx` | composed, single-screen today → feature-local per decision tree row 3; **promote `DateRangeFields` to `components/shared/date-range-fields/` the next time a 2nd screen needs `from<=to` validation** (leave this note for the next architect run touching filters) |
| `StatusBadge` (action/entity badge) | `components/shared/status-badge/` (existing) | reused, not modified — tone computed by a local pure function, not a new badge variant |
| `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Skeleton`, `Select`, `Input`, `Button` | `components/ui/*` (existing) | reused primitives, unmodified |

Two small pure (non-React) helper files also live under `components/` — they
are view-formatting logic, not domain logic, so presentation-layer placement
is correct (no `domain/`/`infrastructure/` import):
- `components/audit-badge-tone.ts` — `auditBadgeTone(entityType, action): StatusTone`
- `components/format-audit-value.ts` — `formatAuditValue(value: unknown): string`

## 4. ViewModel — `audit-log-screen.i-vm.ts`

```ts
import type {
  AuditAction,
  AuditEntityType,
  AuditEvent,
} from "../../domain/entities/audit-event.entity";
import type { AuditLogFilter } from "../../domain/entities/audit-log-filter.entity";
import type { AuditLogFailure } from "../../domain/failures/audit-log.failure";

/** One page of results, as returned by getAuditLogAction and by each
 *  useInfiniteQuery page (fe-state-engineer flattens these client-side). */
export interface AuditLogPage {
  events: AuditEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type AuditLogActionResult =
  | { ok: true; data: AuditLogPage }
  | { ok: false; errorKey: AuditLogFailure["type"] };

/** Server → client boundary contract for AuditLogScreen (US-E12.12). RSC
 *  pre-fetches page 1 server-side; AuditLogScreen (container) re-fetches
 *  subsequent pages/filters client-side through the same action ref. */
export interface AuditLogScreenVM {
  initialFilter: AuditLogFilter;
  initialPage: AuditLogPage;
  /** Non-null only if the RSC-side first fetch itself failed (rare — page
   *  still renders, AuditLogScreen shows ErrorBanner immediately). */
  initialErrorKey: AuditLogFailure["type"] | null;
  /** Server Action ref — re-used for every filter change and "Tải thêm"
   *  click. Never called directly from a presentational leaf; only
   *  AuditLogScreen (container) calls it via TanStack Query's queryFn. */
  getAuditLogAction: (
    filter: AuditLogFilter,
    cursor: string | null,
  ) => Promise<AuditLogActionResult>;
}

export type { AuditAction, AuditEntityType, AuditEvent, AuditLogFilter };
```

Notes for `fe-state-engineer` (hand-off):
- `initialPage` seeds `useInfiniteQuery`'s first page (`initialData`), keyed
  `["audit-log", filter]` per plan.md's stated key shape — re-key whenever
  `initialFilter` (i.e. the URL search params) change.
- `getAuditLogAction` is the ONE queryFn for both "apply filter" (cursor=null)
  and "load more" (cursor=nextCursor) — no separate action needed.
- `AuditLogScreen` derives `status` for `AuditLogResults` from query state:
  `initialErrorKey || queryError → "error"`; `isLoading (first page) →
  "loading"`; `events.length === 0 && !isLoading → "empty"`;
  `isFetchingNextPage → results render "success" while LoadMoreButton shows
  its own isLoadingMore`; else `"success"`.

## 5. Prop interfaces (per component)

### `AuditLogScreen` (container — not itself a reusable prop contract, but its
external prop shape from the RSC page)

```ts
export type AuditLogScreenProps = AuditLogScreenVM;
```

### `ComplianceNotice`

```ts
// components/compliance-notice.tsx — static, translates its own copy
// (auditLog.compliance.*), no props needed.
export type ComplianceNoticeProps = Record<string, never>;
```

### `FilterBar`

```ts
// components/filter-bar.tsx
export interface AuditLogFilterDraft {
  entityType?: AuditEntityType;
  action?: AuditAction;
  actorQuery?: string;
  from?: string; // ISO date "YYYY-MM-DD"
  to?: string;   // ISO date "YYYY-MM-DD"
}

export interface FilterBarProps {
  filters: AuditLogFilterDraft;
  onFilterChange: (patch: Partial<AuditLogFilterDraft>) => void;
  onReset: () => void;
}
```

Mirrors `ExamBankFilterBar`'s `Partial<...>` patch-update convention. No
"Search" apply button (unlike the design mockup's draft/applied split) —
filters are URL search params owned by the container (fe-state-engineer), so
every `onFilterChange` call re-fetches immediately; the mockup's client-side
draft/apply-batching is a design artifact of its fake client-side filtering,
not something to carry into the real cursor-paginated contract.

### `DateRangeFields` (composed sub-component of `FilterBar`)

```ts
// components/date-range-fields.tsx
export interface DateRangeFieldsProps {
  from?: string; // ISO date
  to?: string;   // ISO date
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}
```

- Validation (`from <= to`) is a **pure derivation from props**, computed
  internally via `useMemo` inside `DateRangeFields` — not stored/owned
  server-side or in a query; this is the "internal UI state" case per §6.
- Renders a visible error message + wires `aria-invalid`/`aria-describedby`
  on the "to" field when `from > to` (see §7 a11y).

### `AuditLogResults` (status switch — no own state)

```ts
// components/audit-log-results.tsx
export type AuditLogResultsStatus =
  | "loading"
  | "error"
  | "empty"
  | "success";

export interface AuditLogResultsProps {
  status: AuditLogResultsStatus;
  events: AuditEvent[];
  errorKey: AuditLogFailure["type"] | null;
  onRetry: () => void;
}
```

Renders exactly one of `LoadingSkeletonRows` / `ErrorBanner` / `EmptyState` /
`LogTable` based on `status` (mirrors `AuditTrailTable`'s inline
`isLoading ? … : entries.length === 0 ? … : <Table>` branching, but split
into named sub-components here because a 4th state — error — is required by
AC-10, which `AuditTrailTable` doesn't have).

### `LoadingSkeletonRows`

```ts
// components/loading-skeleton-rows.tsx
export interface LoadingSkeletonRowsProps {
  rowCount?: number; // default 5
}
```

### `ErrorBanner`

```ts
// components/error-banner.tsx
export interface ErrorBannerProps {
  errorKey: AuditLogFailure["type"];
  onRetry: () => void;
}
```

Translates `errorKey` via `t(\`errors.${errorKey}\`)` inside the component
(same boundary rule as every other screen — server never translates).

### `EmptyState`

```ts
// components/empty-state.tsx — no props; static copy (auditLog.empty.*)
export type EmptyStateProps = Record<string, never>;
```

### `LogTable`

```ts
// components/log-table.tsx
export interface LogTableProps {
  events: AuditEvent[];
}
```

Mirrors `audit-trail-table.tsx`: heading `<h2>` outside `<Table>` (accessible
name, AC-12), `TableHead` per column, `useFormatter().dateTime()` for
`occurredAt`. Renders `<LogRow>` per event — no pagination/loading/error
logic inside (that's `AuditLogResults`'s job — keeps `LogTable` a pure list
renderer, not a repeat of `AuditTrailTable`'s bundled-state anti-pattern).

### `LogRow`

```ts
// components/log-row.tsx
export interface LogRowProps {
  event: AuditEvent;
}
```

Internally: `auditBadgeTone(event.entityType, event.action)` → `StatusBadge`
tone; `formatAuditValue(event.beforeValue)` / `formatAuditValue(event.afterValue)`
for the before/after cells; `t(\`entityType.${event.entityType}\`)` and
`t(\`action.${event.action}\`)` for badge/action labels. No delete/edit
affordance rendered anywhere in this row (AC-8).

### `LoadMoreButton`

```ts
// components/load-more-button.tsx
export interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}
```

Renders `null` when `!hasMore` (matches plan.md AC-7: "nút biến mất khi hết
data" — not disabled, removed from the tree). `aria-label` is a translated
string (`auditLog.loadMore.ariaLabel`), distinct from its visible label so a
screen reader announces "Tải thêm nhật ký kiểm toán" rather than just "Tải
thêm" (AC-12).

### Pure helpers (not components)

```ts
// components/audit-badge-tone.ts
import type { StatusTone } from "@/components/shared/status-badge";
import type { AuditAction, AuditEntityType } from "../../../domain/entities/audit-event.entity";

/** Tone by entityType, EXCEPT action === "DELETE" always renders error
 *  regardless of entityType (story.md line 26 + fe-lead ruling). */
export function auditBadgeTone(
  entityType: AuditEntityType,
  action: AuditAction,
): StatusTone;
```

```ts
// components/format-audit-value.ts
/** unknown → display string for before/after cells. null/undefined → "—".
 *  Objects → JSON.stringify (compact); primitives → String(value). Pure,
 *  no i18n (numbers/JSON are locale-agnostic here; no translation needed). */
export function formatAuditValue(value: unknown): string;
```

## 6. State ownership (contract level — hand-off to fe-state-engineer)

| State | Owner | Notes |
| --- | --- | --- |
| Filters (`entityType`, `action`, `actorQuery`, `from`, `to`) | URL search params, read/written by `AuditLogScreen` | shareable/back-button friendly per plan.md; `FilterBar` receives current values as **controlled props**, never holds its own copy |
| Event list + cursor + hasMore | TanStack Query (`useInfiniteQuery`, key `["audit-log", filter]`) inside `AuditLogScreen` | `fe-state-engineer` details `getNextPageParam`/flattening; `AuditLogResults`/`LogTable` only ever see the already-flattened `events[]` |
| `status` (loading/error/empty/success) | Derived in `AuditLogScreen` from query state (§4 notes) | not stored anywhere; recomputed every render |
| `from <= to` validation | Internal derived UI state in `DateRangeFields` (`useMemo` over its own props) | NOT server state, NOT in the query key directly (the container still passes an invalid range through to `onFilterChange` only if valid — i.e. `DateRangeFields` should call `onToChange`/`onFromChange` on every keystroke, but `AuditLogScreen` may choose to skip re-querying while invalid; that gating is a state-engineer call, not blocked by this contract) |
| `isLoadingMore` | Derived from `useInfiniteQuery`'s `isFetchingNextPage` in `AuditLogScreen` | passed straight through to `LoadMoreButtonProps.isLoadingMore` |

No Zustand/global store — matches plan.md and repo convention.

## 7. Composition & variant strategy

- No compound-component/slot pattern needed here — this is a straightforward
  filter+list+paginate screen, not a primitive needing `asChild`/`Slot`.
- No new `cva` variants — `StatusBadge`'s existing `tone` prop covers every
  color needed; `auditBadgeTone()` is a plain mapping function, not a new
  variant on the badge itself.
- `AuditLogResults`'s 4-way status switch is the only "compound-ish" pattern
  in this tree, and it is intentionally a plain `if/else` component (not a
  generic `<StatusSwitch>` abstraction) — only one consumer exists; do not
  abstract until a 3rd screen needs the same 4-state (loading/error/empty/
  success) branching (2 would still be below the abstraction threshold used
  elsewhere in this repo, e.g. `ClassCard`/`RosterPagination` promotion
  notes).
- Extension point: if a future story adds an "Export CSV" affordance (plan.md
  notes it's a placeholder, scoped out here), it plugs in next to
  `LoadMoreButton` inside `AuditLogScreen`'s footer row — no tree
  restructuring needed.

## 8. Accessibility contract (AC-12)

| Element | Requirement |
| --- | --- |
| `LogTable` | Accessible name via a visible `<h2>` heading immediately before `<Table>` (mirror `audit-trail-table.tsx` — not a bare `<caption>`, per plan.md Phase 4 note); every `TableHead` sets `scope="col"` |
| `LogRow` cells | No interactive delete/edit control anywhere (AC-8) — purely `TableCell` text/badge content |
| `FilterBar` entity-type / action `Select` | `SelectTrigger` gets `aria-label` (mirrors `ExamBankFilterBar`'s `filter.subjectAriaLabel` pattern) since there's no visible `<label>` sibling in the compact filter-bar layout |
| `FilterBar` actor `Input` | Associated `<label>` (visible or `sr-only`, matching `StaffLeaveFilters`'s `useId()` + `htmlFor` pattern) — `aria-label` alone is not enough per `.claude/rules/accessibility.md` "mọi input có `<label>` liên kết" |
| `DateRangeFields` from/to inputs | Each wrapped in `<label htmlFor=...>` (own `useId()`, mirrors `StaffLeaveFilters`); when `from > to`: "to" input gets `aria-invalid="true"` + `aria-describedby` pointing at a visible `<p id=...>` error message (translated `auditLog.filters.dateRangeError`) — **not a hardcoded `null`**, this was a prior-story a11y finding and must be a real computed boolean from the `useMemo` validation in §5 |
| `LoadMoreButton` | `aria-label` = translated full sentence ("Tải thêm nhật ký kiểm toán"/"Load more audit log entries"), distinct from the shorter visible label; button is a real `<button type="button">` (keyboard operable by default); removed from DOM (not just visually hidden) when `!hasMore` so it isn't a dead tab-stop |
| `ErrorBanner` | `role="alert"` on the message container (mirrors `notifications-center.tsx`'s `ErrorState`) so screen readers announce it without focus; Retry is a real `<button>` |
| `ComplianceNotice` | Static text banner — no interactive elements, no special role needed beyond being readable in document order before the filter bar |
| Focus | All interactive elements (`Select`, `Input`, date inputs, buttons) keep Radix/shadcn's built-in focus-visible ring — no custom `outline: none` |
| Motion | `LoadingSkeletonRows` shimmer must respect `prefers-reduced-motion` (inherits from `Skeleton` primitive — no new animation introduced here) |

## 9. i18n namespace shape (for reference — fe-nextjs-engineer fills in)

All copy under `auditLog`: `title`, `compliance.*`, `filters.{entityType,action,actor,dateFrom,dateTo,reset,dateRangeError,entityTypeAriaLabel,actionAriaLabel,actorAriaLabel}`, `columns.{occurredAt,actor,action,entityType,entity,before,after}`, `entityType.{grade,conduct,record,setting}`, `action.{CREATE,UPDATE,DELETE,APPROVE,LOCK,SEAL,UNSEAL}`, `empty.{title,hint}`, `errors.*` (keyed by `AuditLogFailure["type"]`), `loadMore.{label,ariaLabel}`, `allDone` (shown when `!hasMore && events.length > 0`, optional — matches mockup's "Đã hiển thị tất cả" but not an AC; include only if `fe-lead` wants parity with the mockup's finished-state copy).
