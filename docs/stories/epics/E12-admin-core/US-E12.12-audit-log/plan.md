# US-E12.12 — Audit Log (Admin, Append-Only, Cursor-Paginated) — Plan

## Goal
Admin-only screen at `/admin/audit-log` listing append-only audit events
(grade/conduct/record/setting mutations) with entity-type/action/actor/date
filters and cursor pagination ("Tải thêm"). Read-only — no create/update/delete
UI (AC-8). GDPR/Nghị định 13/2023 note is a static compliance banner, no logic.

## BE contract status — mock-first (decision 0014)
Story.md claims BE REAL ("US-064 BE comment suggests audit endpoints built"),
but this is **unconfirmed** in this repo: `grep -rl core src/bootstrap/endpoint/`
finds files that *target* the `core` service (e.g. `academic-records.endpoint.ts`,
`staff-leave.endpoint.ts`) but none of them have a live core backend today —
every sibling core-service repository in this codebase (`academic-records-seal.repository.ts`,
`timetable`, `class-management`, `subject-catalogue`) currently ships as
**mock-first with a `notImplemented()` REAL scaffold**, because `core` service
US-06x lands piecemeal and has repeatedly been "suggested live" before it
actually was (see US-E12.10/E12.5/E12.3 TEST_MATRIX notes: "core absent").
No `audit-log.endpoint.ts` exists yet.

**Decision for this plan:** build **mock-first** (`NEXT_PUBLIC_USE_MOCK`,
`src/bootstrap/lib/mock.ts` `USE_MOCK` flag), same split pattern as
`academic-records-seal.repository.ts` / `mock-academic-records-seal.repository.ts`:
- `AuditLogRepository` (REAL, `server-only`) fully wired to the documented
  contract (`GET /core/api/v1/audit-log?...`, cursor pagination via
  `{ raw: true }` + `parseEnvelope`) but every method throws `not-implemented`
  until `core` US-064 is confirmed live — DI never selects it while
  `USE_MOCK=true`.
- `MockAuditLogRepository` — in-memory seed (~30-40 events spanning all
  entity types/actions/dates), synchronous filter + cursor slicing (limit 20),
  `mockDelay()`.
- **[FLAG for fe-lead/ba-lead]**: confirm US-064 status before flipping
  `USE_MOCK=false` in this story's DI factory. If BE turns out to already be
  live, only Phase 2's REAL repository needs un-scaffolding (bodies filled in)
  — no domain/presentation rework required, since both repos implement the
  same `IAuditLogRepository` interface.

## Reused contracts (do not redefine)
- `requireRole(["admin"])` from `src/bootstrap/auth-guard/require-role.server.ts`
  — called in **every** Server Action in `actions.ts`, including the read/list
  action (defense-in-depth alongside the RSC-level `AdminLayout` guard; lesson
  from US-E14.6 review — a missing RBAC check on a read action was flagged).
- `StatusBadge` (`src/components/shared/status-badge`) for action/entity-type
  badges — tone mapping per story.md: điểm→`success`, hạnh kiểm→`warning`,
  học bạ→`primary`, cài đặt→`info`, xóa→`error`. Do NOT invent a new badge.
- shadcn `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`
  (`src/components/ui/table`) — same usage pattern as
  `src/features/academic-records/presentation/academic-record-seal-screen/components/audit-trail-table.tsx`
  (caption via a heading + `TableHead` scope, `useFormatter().dateTime` for
  timestamps, `Skeleton` rows for loading).
- `parseEnvelope` / `ApiError` / `Pagination` from `src/bootstrap/lib/api-envelope.ts`
  for the REAL repo's cursor-pagination read (`meta.pagination.{nextCursor,hasMore}`).
- Clean Architecture module layout mirrors
  `src/app/[locale]/t/[tenant]/(app)/admin/academic-records/{page.tsx,actions.ts}`
  + `src/features/academic-records/{domain,infrastructure,presentation}`.

## Phases (TDD red → green → refactor)

### Phase 1 — Domain
Files:
- `src/features/audit-log/domain/entities/audit-event.entity.ts`
  — `AuditEvent { id, occurredAt: string(ISO), actorId, actorName, actorRole,
  action: AuditAction, entityType: AuditEntityType, entityId, entityLabel,
  beforeValue: unknown, afterValue: unknown }`; union types
  `AuditAction = "CREATED" | "UPDATED" | "DELETED" | "GRADE_APPROVED" |
  "RECORD_SEALED" | "RECORD_UNSEALED" | "CONDUCT_OVERRIDE" | "SETTING_CHANGED"`
  (align exact members with story.md AC list + design_src `AL_ACTION_META`
  keys); `AuditEntityType = "grade" | "conduct" | "record" | "setting"`.
- `src/features/audit-log/domain/entities/audit-log-filter.entity.ts`
  — `AuditLogFilter { entityType?, action?, actorQuery?, from?: string,
  to?: string }` (all optional; empty filter = no-op).
- `src/features/audit-log/domain/failures/audit-log.failure.ts`
  — typed union: `"network-error" | "unauthorized" | "forbidden" |
  "invalid-filter" | "unknown"`.
- `src/features/audit-log/domain/repositories/i-audit-log.repository.ts`
  — `getAuditLog(filter: AuditLogFilter, cursor: string | null, limit: number):
  Promise<Result<{ events: AuditEvent[]; nextCursor: string | null; hasMore: boolean }, AuditLogFailure>>`
  (`Result` = the repo's existing ok/err pattern, mirror
  `IAcademicRecordsSealRepository`'s `SealResult` shape).
- `src/features/audit-log/domain/use-cases/get-audit-log.use-case.ts`
  — thin orchestration: validates `from <= to` (else `invalid-filter`),
  delegates to repo, returns as-is otherwise. Pure, no side effects.

Test first (`get-audit-log.use-case.test.ts`, mock `IAuditLogRepository`):
- valid filter → delegates + returns repo result unchanged
- `from > to` → returns `invalid-filter` without calling repo
- repo network error → passthrough failure
Done when: unit tests green.

### Phase 2 — Infrastructure + bootstrap
Files:
- `src/bootstrap/endpoint/audit-log.endpoint.ts` (new) —
  `AUDIT_LOG_EP = { list: "/audit-log" }` mounted under core service base
  (confirm base-URL convention used by `academic-records.endpoint.ts`, likely
  service prefix handled by the http client config, not the endpoint const).
- `src/features/audit-log/infrastructure/dtos/audit-event-response.dto.ts`
  — camelCase DTO matching the documented envelope (`AuditEventDto[]`).
- `src/features/audit-log/infrastructure/mappers/audit-log.mapper.ts`
  — pure fn `toAuditEvent(dto): AuditEvent`.
- `src/features/audit-log/infrastructure/repositories/audit-log.repository.ts`
  — `import "server-only"`; REAL impl per §BE contract status above: builds
  query params from filter + cursor/limit, `{ raw: true }` GET,
  `parseEnvelope()` to read `data` + `meta.pagination`, maps each item, maps
  `ApiError.code` → `AuditLogFailure` (`UNAUTHORIZED`→unauthorized,
  `FORBIDDEN`/`SCHOOL_FORBIDDEN`→forbidden, network→network-error,
  else→unknown). Every method currently throws `not-implemented` (scaffold
  only) — documented via the same header comment style as
  `academic-records-seal.repository.ts`.
- `src/features/audit-log/infrastructure/repositories/mock-audit-log.repository.ts`
  — module-level seed array (mirror `design_src/edu/audit-log.jsx` `AL_SEED`
  shape for realism), synchronous in-memory filter (entityType/action/actorQuery
  substring/date range) + cursor slice (`limit=20`, cursor = last event id or
  offset-encoded string), `mockDelay()`.
- `src/bootstrap/di/audit-log.di.ts` — `import "server-only"`;
  `makeGetAuditLogUseCase()`: `USE_MOCK ? new MockAuditLogRepository() : new AuditLogRepository(await createServerHttpClient())`
  wired into `GetAuditLogUseCase`. Add to `bootstrap/di/index.ts` re-export.

Test first:
- `audit-log.mapper.test.ts` — DTO → entity field-by-field, unknown action/entityType fallback.
- `mock-audit-log.repository.test.ts` (integration-tier, in-memory) — filter combinations
  (entityType only, action only, date range, actor substring, combined), cursor
  pagination (page 1 → nextCursor set; last page → hasMore false, nextCursor null),
  empty-result filter.
- `audit-log.repository.test.ts` (REAL, contract-shape only while scaffolded) —
  asserts query-param construction + `ApiError.code` → failure mapping using a
  stubbed axios instance (same style as other REAL-but-scaffolded repo tests,
  e.g. check `academic-records-seal.repository.test.ts` if present, else model
  on `admin-settings.repository.test.ts` GET/PUT-error-mapping tests).
Done when: mapper + mock-repo + real-repo-contract tests green.

### Phase 3 — Presentation, i18n, Storybook
High-level component tree (fe-component-architect finalizes contracts):
```
AuditLogScreen (client, receives initial VM + Server Action refs as props)
├── ComplianceNotice        (static banner — GDPR/Nghị định 13/2023 text)
├── FilterBar               (entity type select, action select, actor text input,
│                            date-from/date-to inputs, reset)
├── LogTable                (shadcn Table; header caption + scope per AC-12)
│   └── LogRow[]            (StatusBadge for action/entity type; before/after
│                            value cells; no delete/edit affordance — AC-8)
├── EmptyState               (no results matching filter)
├── ErrorBanner + Retry      (AC-10)
├── LoadingSkeletonRows      (AC-1)
└── LoadMoreButton           (AC-7; aria-label; hidden when !hasMore)
```
Files:
- `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.i-vm.ts`
  — VM contract: `{ events: AuditEvent[], nextCursor, hasMore, filter, status:
  "idle"|"loading"|"loading-more"|"error"|"empty"|"success" }` + action props
  (`onFilterChange`, `onLoadMore`, `onRetry`).
- `.../audit-log-screen.tsx` (`'use client'`) + subcomponents under
  `.../components/` (filter-bar.tsx, log-table.tsx, log-row.tsx, empty-state.tsx,
  compliance-notice.tsx) + `.stories.tsx` per component covering
  Loading / List_MixedActionTypes / Filter_EntityType / Filter_DateRange /
  LoadMore / EmptyState / ErrorState (matches story.md Validation table).
- `src/app/[locale]/t/[tenant]/(app)/admin/audit-log/page.tsx` (RSC) —
  calls `requireRole` implicitly via inherited `AdminLayout` guard, prefetches
  page 1 via `makeGetAuditLogUseCase()`, passes VM + action refs to screen.
- `src/app/[locale]/t/[tenant]/(app)/admin/audit-log/actions.ts` (`'use server'`)
  — `getAuditLogAction(filter, cursor)`: **explicit `requireRole(["admin"])`
  call first**, then `makeGetAuditLogUseCase()`, execute, return
  `{ ok: true, data } | { ok: false, errorKey: AuditLogFailure }` (no
  translation at this boundary per i18n.md).
- i18n: `auditLog` namespace added to
  `src/bootstrap/i18n/messages/{vi,en}.json` (vi source + en mirror) — page
  title, compliance notice copy, filter labels, column headers, action/entity
  labels, empty/error copy, `loadMore` button label + aria-label, `errors.*`
  keyed by `AuditLogFailure["type"]`.

State/query approach (high-level; fe-state-engineer to detail):
- Filters = URL search params (shareable, back-button friendly) — no
  client-side-only filter state duplicated in a store.
- List data = TanStack Query, key scoped by `["audit-log", filter]`; cursor
  pagination via `useInfiniteQuery` (`getNextPageParam` from `nextCursor`),
  `LoadMoreButton` calls `fetchNextPage`. No Zustand/global store.
- Actor-name search: server-side per story.md Domain rules ("prefer
  server-side") — passed as a filter param, not filtered client-side over a
  loaded page (keeps cursor pagination correct against the full result set).

Test first: Storybook interaction stories (play() functions) per the 7 states
listed in story.md Validation row — this is the primary E2E-tier proof
(Playwright deferred unless fe-lead escalates, matching sibling US-E12.x
pattern of Storybook-only E2E for read-only admin screens).
Done when: design-review gate ready (states covered, tokens-only, a11y pass).

### Phase 4 — RBAC + a11y (cross-cutting, alongside Phase 3)
- `actions.ts`: `requireRole(["admin"])` at the top of the read/list action —
  do not rely solely on `AdminLayout`'s RSC-level `evaluateAdminAccess` guard
  (defense-in-depth; explicitly called out in this story's context).
- A11y (AC-12): `<Table>` has an accessible name (heading or `aria-labelledby`,
  not a bare `<caption>` unless it matches shadcn Table's existing pattern —
  check `audit-trail-table.tsx` precedent: heading `<h2>` outside the table,
  keep consistent); `TableHead` uses `scope="col"`; `LoadMoreButton` has
  `aria-label` (e.g. "Tải thêm nhật ký"); all filter inputs have associated
  `<label>`; date-range inputs validate `from <= to` with a visible error
  message (not color-only), `aria-invalid` + `aria-describedby`.

## Test plan → `docs/TEST_MATRIX.md` (row exists at `planned`, fills to `implemented`)
| Layer | Proof this story will produce |
| --- | --- |
| Unit | `get-audit-log.use-case.test.ts` (3+ cases); `audit-log.mapper.test.ts` |
| Integration | `mock-audit-log.repository.test.ts` (filter combos + cursor pagination + empty); `audit-log.repository.test.ts` (REAL contract shape: query-param construction, `ApiError.code`→failure mapping) |
| E2E | Storybook interaction: Loading / List_MixedActionTypes / Filter_EntityType / Filter_DateRange / LoadMore / EmptyState / ErrorState (7 stories, play() assertions) |
| Platform | `bun build` + `tsc --noEmit` clean |
| Release | design-review gate pass; RBAC verified (non-admin redirect, per AC-11, likely covered by existing `AdminLayout` guard test suite — confirm no new test needed there, only the Server Action's explicit `requireRole` call) |

## Open questions for fe-lead
1. **BE US-064 status** — confirm before wiring `USE_MOCK=false`; plan above
   defaults to mock-first per repo convention until confirmed (see §BE
   contract status).
2. Exact `AuditAction` enum members — story.md lists `GRADE_APPROVED,
   RECORD_SEALED, CONDUCT_OVERRIDE, SETTING_CHANGED...` (ellipsis = non-exhaustive).
   Needs reconciling against `design_src/edu/audit-log.jsx` `AL_ACTION_META`
   keys + BE's actual action taxonomy once US-064 confirmed — flag to
   fe-component-architect/ba-lead, do not guess further members without a
   source.
3. Cursor encoding for the mock repo (opaque string vs. plain offset) — pick
   whichever `MockAuditLogRepository` implementation makes tests simplest;
   must not leak into `AuditEvent`/domain types (cursor stays infra-only).
4. GDPR/Nghị định 13/2023 ADR — already flagged in story.md Harness Delta for
   ba-lead; not re-flagged here, only noted as a dependency for the
   `ComplianceNotice` copy (final wording should await/align with the ADR).

## State Architecture (fe-state-engineer)

No global client store (Zustand/Redux/Jotai) is introduced or needed — every
piece of state below maps to server state (TanStack Query), URL state, or
local component/form state, per repo convention.

### Precedent grep (repo has exactly one prior cursor-pagination screen)

- `useInfiniteQuery` exists in **one** place today:
  `src/features/notification/presentation/notifications-center/notifications-center-container.tsx`
  (`notificationKeys.list(filter)`, `getNextPageParam` from `hasMore`/`nextCursor`,
  flatten via `data.pages.flatMap(p => p.items)`). This is the direct template
  for audit-log's infinite list.
- `HydrationBoundary`/`dehydrate` — **zero matches repo-wide.** This repo does
  NOT use the RSC-prefetch-into-QueryClient-cache hydration pattern. There is
  no precedent to align with there; two RSC-boundary conventions coexist instead:
  1. **RSC calls DI use-case directly, passes result as a plain prop** (e.g.
     `admin/staff-leave/page.tsx`, `admin/calendar/page.tsx`,
     `admin/grade-book/page.tsx`) — client holds it in `useState`, mutates via
     Server Actions + `startTransition`. No TanStack Query at all.
  2. **RSC only decodes identity/wires Server Action refs; client fetches on
     mount via TanStack Query** (`academic-record-seal` page.tsx +
     `notifications` — no `page.tsx` even exists for notifications, it's
     rendered from a shared shell and fetches entirely client-side).
  Audit-log needs pagination cache semantics (append pages, reset key on
  filter change) that only TanStack Query gives cleanly, but per plan.md's
  Phase-3 direction it should also avoid a first-paint loading-skeleton
  flash for the default (no-filter) view. Decision: **hybrid** — RSC
  prefetches page 1 for the *default filter* via `makeGetAuditLogUseCase()`
  (pattern 1), and the client container seeds `useInfiniteQuery`'s cache for
  that exact query key with `initialData` built from the RSC result (pattern
  2's query engine). This is the first screen combining both; documented here
  explicitly since there's no existing file to copy verbatim.

### 1. Query key hierarchy

```
auditLogKeys.all                          = ["audit-log"] as const
auditLogKeys.lists()                      = [...all, "list"] as const
auditLogKeys.list(filter: AuditLogFilter) = [...lists(), filter] as const
```

- `filter` is the **applied** filter object (see §2) — `{ entityType?, action?,
  actorQuery?, from?, to? }`, normalized (omit `undefined` keys, trim
  `actorQuery`, so `{}` and `{ actorQuery: "" }` hash identically) before it
  enters the key. Query keys are structurally hashed by TanStack Query, so a
  stable normalized shape avoids spurious cache misses.
- One `useInfiniteQuery` per distinct applied filter — this IS the mechanism
  that makes "filter change ⇒ fresh infinite query, not append onto stale
  pages" hold (AC-7 requirement): changing the applied filter changes
  `auditLogKeys.list(filter)`, which is a brand-new cache entry with its own
  empty `pages`/`pageParams`, so `fetchNextPage` on the *old* key can never
  leak into the *new* key's page array. No manual reset code needed.
- `auditLogKeys.all` is the invalidation root (used by `queryClient.invalidateQueries`
  if a future write ever needs to bust the whole audit-log cache — none exists
  in this read-only story, but keeping the 3-level factory, matching
  `notificationKeys`, costs nothing and keeps the convention consistent).

### 2. `useInfiniteQuery` configuration

```
useInfiniteQuery({
  queryKey: auditLogKeys.list(appliedFilter),
  queryFn: ({ pageParam }) => getAuditLogAction(appliedFilter, pageParam),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) =>
    lastPage.ok && lastPage.data.hasMore ? lastPage.data.nextCursor : undefined,
  initialData: isDefaultFilter(appliedFilter) ? rscSeededInitialData : undefined,
  staleTime: 30_000,     // matches notificationKeys precedent; admin audit data
                         // is append-only from the tail, page 1 can go stale
                         // fast if a new event just landed — 30s balances
                         // "don't hammer on every filter click" vs freshness
  gcTime: 5 * 60_000,    // default-ish; keep a few recently-viewed filter
                         // combos warm for back/forward without re-fetching
  refetchOnWindowFocus: false, // matches global provider default
  retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
})
```

- **Page merge strategy**: TanStack's own `pages` array is the merge
  mechanism — never manually concatenate into a flat array in cache; flatten
  only at render time: `const events = data?.pages.flatMap(p => p.ok ? p.data.events : []) ?? []`.
  This keeps `fetchNextPage` idempotent and keeps per-page error state
  addressable (a failed page N does not corrupt pages 1..N-1).
- **`initialPageParam`/cursor type**: `string | null` (opaque cursor per
  plan.md Phase-2 note — "must not leak into `AuditEvent`/domain types, cursor
  stays infra-only"; the VM/query layer treats it as an opaque token, never
  parses it).
- **`retry`**: only when `ApiError.retryable === true` per
  `.claude/rules/api-integration.md` — `isRetryable(error)` inspects the
  thrown `AuditLogFailure`-shaped error's `retryable` flag (the Server Action
  must thread this through in its error result, not just `errorKey` — see §4).
- **RSC-seeded `initialData`**: only wired for the *exact* default-filter key
  (empty filter object). Any other filter combination (including one the user
  arrives at via a shareable URL, e.g. `?entityType=grade`) has no seed and
  shows the AC-1 loading skeleton on first client mount — acceptable per AC-1
  ("Skeleton rows khi load audit log") and avoids over-engineering RSC
  prefetch for every possible filter permutation.

### 3. Filter state: draft vs applied — URL params for applied, local state for draft

Preserve the design's draft/applied split (`design_src/edu/audit-log.jsx`
"Tìm kiếm" button pattern) — **recommended**, matches design intent and gives
a real UX/technical benefit: it decouples "user is mid-typing an actor name or
picking a date" from "a network request + query-key change fires."

| State | Placement | Why |
| --- | --- | --- |
| **Draft filter** (`FilterBar` controlled inputs: entity-type select, action select, actor text input, date-from/date-to) | **Local component state** in `FilterBar` (or the container, lifted only as far as needed for the "Tìm kiếm"/"Đặt lại" buttons) — plain `useState<AuditLogFilterDraft>` | Not shareable, not shared across components, changes on every keystroke — would cause a `useInfiniteQuery` refetch storm per keystroke if synced to URL/query key directly. Matches repo convention: "local form state" for inputs not shared. |
| **Applied filter** (what actually drives the query) | **URL search params** (`useSearchParams` + a router push/replace on "Tìm kiếm" submit) — shareable, back-button friendly, and IS the source `auditLogKeys.list(filter)` reads from | AC-3..AC-6 are filter behaviors an admin will want to bookmark/share ("send me the audit log filtered to hạnh kiểm for March") and the back button should restore the previous filter view — URL state is the only mechanism in this repo's toolkit that satisfies both, and CLAUDE.md's state table puts "shareable, navigational (filters...)" squarely in URL state, not local state. |

Flow: `FilterBar` edits draft state only. On submit ("Tìm kiếm"): draft is
validated (`from <= to`, else inline error per AC-12's a11y requirement,
`aria-invalid`/`aria-describedby` — no network call fires) → on success, the
container writes the draft into URL search params
(`?entityType=&action=&actor=&from=&to=`, using `next-intl`'s routing per
repo convention, omitting empty values from the URL for cleanliness) → the
change in `useSearchParams()` output is what the container derives
`appliedFilter` from → `appliedFilter` changing changes `auditLogKeys.list(...)`
→ TanStack Query mounts a **fresh** infinite query (empty pages, `fetchNextPage`
starts from page 1 again) automatically. "Đặt lại" (reset) clears both draft
and URL params in one action.

This also directly satisfies the story's hard requirement that a filter
change must never append onto stale pages: because the query key is derived
from the URL-synced applied filter, and query keys fully own page identity in
TanStack Query, there is no manual reset call to forget — changing the key IS
the reset.

Do not put `appliedFilter` in a separate `useState` that mirrors the URL —
read it directly from `useSearchParams()` on each render (or via a small
memoized parse) so the URL remains the single source of truth and there's no
class of bug where local state and URL drift out of sync.

### 4. RSC ↔ client boundary

- `page.tsx` (RSC): reads the **initial URL search params** (Next.js
  `searchParams` prop, App Router convention) to build the default/initial
  filter server-side (so a deep-link like `/admin/audit-log?entityType=grade`
  seeds the *correct* filter's page 1, not always the empty-filter page 1).
  Calls `makeGetAuditLogUseCase()` directly (pattern 1 above — same shape as
  `admin/staff-leave/page.tsx`), executes with `(filterFromSearchParams, null, 20)`,
  maps the `Result<{events,nextCursor,hasMore}, AuditLogFailure>` into a
  plain `AuditLogInitialVm` prop: `{ filter, events, nextCursor, hasMore, loadFailed: boolean }`
  (mirrors `StaffLeaveScreen`'s `initialRequests`/`loadFailed` pair — no
  translation at this boundary, `loadFailed` is a boolean, not a message).
  RBAC here is inherited from the `AdminLayout` RSC guard (no separate
  `requireRole` call needed in `page.tsx` itself — that's `actions.ts`'s job,
  see §5/plan.md §Phase 4).
- Client container (`audit-log-screen-container.tsx`, analogous to
  `notifications-center-container.tsx`): receives `AuditLogInitialVm` +
  `getAuditLogAction` ref as props. Derives `appliedFilter` from
  `useSearchParams()`. Builds `useInfiniteQuery`'s `initialData` **only** when
  `appliedFilter` structurally equals `initialVm.filter` (i.e. the user hasn't
  navigated to a different filter client-side since mount) —
  `{ pages: [{ ok: true, data: { events: initialVm.events, nextCursor: initialVm.nextCursor, hasMore: initialVm.hasMore } }], pageParams: [null] }`.
  If `loadFailed` was true, `initialData` is omitted entirely and the query
  runs fresh client-side (shows AC-10 error state after a real fetch attempt,
  rather than baking a stale RSC failure into the cache).
- All subsequent reads (page 2+, or any filter other than the one RSC
  rendered) go through the **Server Action** `getAuditLogAction(filter,
  cursor)`, never a re-render of `page.tsx` — this keeps the "Tải thêm" and
  filter-change interactions client-side/SPA-like without a full navigation,
  consistent with `notifications-center`'s `fetchPageAction` pattern.

### 5. Server Action contract — `getAuditLogAction`

`src/app/[locale]/t/[tenant]/(app)/admin/audit-log/actions.ts`:

```
export async function getAuditLogAction(
  filter: AuditLogFilter,
  cursor: string | null,
): Promise<
  | { ok: true; data: { events: AuditEvent[]; nextCursor: string | null; hasMore: boolean } }
  | { ok: false; errorKey: AuditLogFailure["type"]; retryable: boolean }
>
```

- **`requireRole(["admin"])` is the first statement in the function body**,
  before `makeGetAuditLogUseCase()` — defense-in-depth per plan.md's explicit
  callout (US-E14.6 review lesson: a missing RBAC check on a read action).
  If it throws/redirects, that propagates as-is (no `ok:false` wrapping needed
  — `requireRole` owns the redirect per its existing contract in
  `src/bootstrap/auth-guard/require-role.server.ts`).
- Stable-key result shape (`{ ok, data } | { ok: false, errorKey }`) matches
  the `calendar`/`staff-leave` action convention already in this repo (`res.ok`
  branching in `calendar-screen.tsx`) rather than the `{ errorKey? }`-only
  shape notifications uses — chosen because audit-log's failure union
  (`network-error | unauthorized | forbidden | invalid-filter | unknown`) has
  a `retryable` dimension the query layer needs (§2's `retry` option), so the
  action must surface it explicitly rather than the client inferring
  retryability from a bare string key.
- No translation here (i18n.md) — `errorKey` is `AuditLogFailure["type"]`,
  translated at presentation via `useTranslations("auditLog.errors")`.

### 6. Async state machine

| State | Trigger | UI treatment |
| --- | --- | --- |
| **idle** | Draft filter being edited, not yet submitted | `FilterBar` inputs live-editable; no skeleton/spinner change to the list below (list still shows last-applied results) |
| **loading** (first page of a filter key) | `isLoading` true (no cached data yet for this `auditLogKeys.list(filter)`) — either initial mount with no RSC seed, or first-ever visit to a new filter combo | `LoadingSkeletonRows` replaces the table body (AC-1) — skeleton, never a spinner, per CLAUDE.md guidance for page data |
| **success** (has rows) | `data.pages` non-empty with ≥1 event | `LogTable` renders rows (AC-2); `LoadMoreButton` visible iff last page's `hasMore === true` (AC-7) |
| **empty** | `isSuccess && events.length === 0` | `EmptyState` "Không tìm thấy kết quả" (AC-9) replaces the table body; `FilterBar` stays interactive so the admin can adjust and retry immediately |
| **error** (first page) | `isError` true on the page-1 fetch | `ErrorBanner` with retry replaces the table body (AC-10); retry button calls `refetch()` — does **not** call `fetchNextPage` |
| **loading-more** | `isFetchingNextPage` true (page ≥2 in flight) | `LoadMoreButton` shows an inline pending/disabled state (label swaps to a "loading" copy, `aria-busy="true"`); existing rows from prior pages **stay rendered and interactive** — nothing is unmounted |
| **error (load-more)** | `fetchNextPage()` promise rejects | Already-loaded rows (all prior pages) **remain visible** — TanStack Query does not clear `data.pages` on a failed `fetchNextPage`, only marks that attempt's error. `LoadMoreButton` swaps to an inline retry affordance (e.g. small error text + "Thử lại" under the last row) instead of the full-screen `ErrorBanner`, so the append-only UX (never blanks the screen) holds structurally, not just by convention. Distinguish this from first-page error via `isFetchingNextPage`/`fetchNextPage().catch()` local flag, not `isError` alone (which only reflects page-1's query status by default in `useInfiniteQuery`) |
| **stale/refetching (background)** | `staleTime` elapsed, window refocus, or explicit `refetch()` while data already present | No skeleton flash — existing rows stay, an unobtrusive `isFetching && !isFetchingNextPage` indicator (e.g. small top-of-table spinner or opacity dim) is optional polish, not an AC requirement; do not block interaction |

Error → failure-union → i18n key mapping: `AuditLogFailure["type"]` values
(`network-error | unauthorized | forbidden | invalid-filter | unknown`) are
the literal keys under `auditLog.errors.*` in
`messages/{vi,en}.json` — `tErrors(errorKey)` at the presentation boundary,
same mechanism as `calendar.errors.*` / `auth.errors.*`. `invalid-filter`
specifically covers the client-side `from <= to` validation failure surfaced
before submit (§3) as well as any server-side echo of the same rule — same
key, same copy, single source of truth for that message.

### 7. Race conditions & resolution

- **Rapid filter changes** (user clicks "Tìm kiếm" repeatedly, or edits and
  resubmits before the previous request lands): each distinct `appliedFilter`
  is a distinct query key, so TanStack Query's own de-dupe/cancellation
  applies per key — an in-flight fetch for a filter the user has since
  navigated away from is left to resolve into its own (now-inactive) cache
  entry and does not race with the new key's fetch. No manual `AbortController`
  needed. The UI only ever renders `useInfiniteQuery`'s state for the
  *current* `appliedFilter`, so a late response for an abandoned filter never
  flashes into view.
- **`fetchNextPage` called twice in quick succession** (double-click on "Tải
  thêm" before the button's disabled/pending state paints): TanStack Query
  natively guards this — `fetchNextPage` while `isFetchingNextPage` is
  already true is a no-op re-entrant call, not a duplicate request; belt-and-
  suspenders, `LoadMoreButton` should also be `disabled={isFetchingNextPage}`
  for keyboard/screen-reader clarity (AC-12).
- **Filter change arriving while a `fetchNextPage` for the old filter is still
  in flight**: covered by the query-key isolation above — the old key's
  promise resolves into the old (now orphaned) cache entry; `gcTime` will
  eventually collect it if unused. No cross-key page bleed is possible since
  pages are stored per-key, not in a shared flat array.
- **Back/forward navigation changing the URL filter under a live component**:
  since `appliedFilter` is derived fresh from `useSearchParams()` on every
  render (§3, no mirrored local state), a browser back/forward event that
  changes the URL is indistinguishable from a "Tìm kiếm" submit to the query
  layer — it simply resolves to a different (or previously-cached, if
  `gcTime` hasn't expired) `auditLogKeys.list(filter)` entry. No special-case
  handling required.
- **Server Action `requireRole` redirect racing a pending `fetchNextPage`**:
  out of scope for client-side race handling — `requireRole` throws a Next.js
  redirect signal that unwinds the Server Action call itself; the client's
  `await getAuditLogAction(...)` call will simply never resolve normally (the
  redirect is handled by Next's navigation, not by the query's error path).
  This mirrors how every other admin Server Action in this repo behaves and
  needs no audit-log-specific handling.
