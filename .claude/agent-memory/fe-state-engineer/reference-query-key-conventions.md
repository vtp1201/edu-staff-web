---
name: query-key-conventions
description: TanStack Query key factory shape and cache duration conventions used in this repo
metadata:
  type: reference
---

## Key factory shape (canonical)

```ts
export const featureKeys = {
  all:    () => ['featureName']                    as const,
  lists:  () => ['featureName', 'list']            as const,
  list:   (params: FilterParams) => ['featureName', 'list', params] as const,
  detail: (id: string) => ['featureName', 'detail', id] as const,
}
```

For sub-resources (e.g., roster under a class):
```ts
roster: (classId: string) => ['featureName', 'roster', classId] as const,
```

## Cache durations (confirmed in codebase)

Global default (`react-query-provider.tsx`): `staleTime: 60_000` (1 min), `retry: 1`, `refetchOnWindowFocus: false`.

Per-feature overrides established for US-E09.1 (discipline screen — first full client-query feature):
- violations list: `staleTime: 120_000` (2 min), `gcTime: 300_000` (5 min)
- conduct list: `staleTime: 180_000` (3 min), `gcTime: 600_000` (10 min) — derived scores, lower churn
- leave requests: stay at global default 1 min / 5 min — most time-sensitive of the three

Multi-subtree key pattern (when a feature has 3+ independent resource types under one root):
```ts
disciplineKeys = {
  all:          () => ['discipline']                                      as const,
  violations:   () => ['discipline', 'violations']                        as const,
  violationList: (f) => ['discipline', 'violations', 'list', f]          as const,
  conduct:      () => ['discipline', 'conduct']                           as const,
  conductList:  (f) => ['discipline', 'conduct', 'list', f]              as const,
  leave:        () => ['discipline', 'leave']                             as const,
  leaveList:    (f) => ['discipline', 'leave', 'list', f]                as const,
}
```
Bust all variants of a subtree with `invalidateQueries({ queryKey: disciplineKeys.violations() })`.

## Invalidation pattern

On `onSettled` of a mutation: `queryClient.invalidateQueries({ queryKey: featureKeys.lists() })` to bust all list variants. Use `detail(id)` for targeted single-item bust.

Only retry when `error.retryable === true` (from `ApiError`). Never retry 401/403.

## List endpoints (cursor pagination)

List endpoints use `meta.pagination.nextCursor` / `hasMore`. Model with `useInfiniteQuery` on the client if pagination is needed client-side. For server-side full drain, use `fetchAllPages()` helper (exists in `TeacherDashboardRepository`).

## Real-time / chat feature pattern (US-E10.1)

For chat-like features (real-time, cursor-paginated messages per entity):

```ts
messagingKeys = {
  all:           ()                       => ['messaging']                             as const,
  conversations: ()                       => ['messaging', 'conversations']            as const,
  messages:      (conversationId: string) => ['messaging', 'messages', conversationId] as const,
  contacts:      (query: string)          => ['messaging', 'contacts', query]         as const,
}
```

Cache overrides for messaging:
- conversations: `staleTime: 30_000`, `gcTime: 120_000`, `refetchOnWindowFocus: true`
- messages (infinite): `staleTime: 10_000`, `gcTime: 60_000`, `refetchOnWindowFocus: false`
- contacts (modal search): `staleTime: 60_000`, `gcTime: 180_000`, `enabled: isModalOpen && query.length >= 1`

SSE mock updates cache via `setQueryData` (no invalidation round-trip). `onSettled` invalidation after mutations reconciles server truth.

**Extended in US-E10.4** — added group detail key:
```ts
messagingKeys = {
  all:           ()                       => ['messaging']                             as const,
  conversations: ()                       => ['messaging', 'conversations']            as const,
  messages:      (conversationId: string) => ['messaging', 'messages', conversationId] as const,
  contacts:      ()                       => ['messaging', 'contacts']                as const,
  group:         (groupId: string)        => ['messaging', 'group', groupId]          as const,  // NEW E10.4
}
```

Group detail cache: `staleTime: 30_000`, `gcTime: 300_000`, `refetchOnWindowFocus: true`. Fetched client-side on panel open (NOT RSC-prefetched). After `leaveGroup`/`deleteGroup`, call `removeQueries({ queryKey: messagingKeys.group(groupId) })` in addition to invalidating conversations to prevent stale group cache after membership ends.

Optimistic pattern for `InfiniteData<MessagePage>` mutations: use `updateInfinitePages(old, msg => ...)` utility to map over pages without flattening — preserves cursor pagination structure.

## Admin two-step approval / safety-critical gate pattern (US-E14.6, academic-record-seal)

For high-risk, one-way-transition admin actions (seal/unseal, publish/lock-style gates):
- **No optimistic updates** on any mutation in the flow — wait for server confirmation
  before flipping UI state; a false-positive "sealed"/"approved" flash that then gets
  rejected is worse UX than a short pending spinner for a low-frequency admin action.
- The gate-check query (e.g. `sealStatus`) uses `staleTime: 0` + `refetchOnWindowFocus: true`
  — safety-critical gates must reflect the latest state, not a cached snapshot.
- A "pending requests" list that a second admin discovers by **independently navigating**
  to the screen (not a live/same-session picker) also gets `staleTime: 0` +
  `refetchOnWindowFocus: true` instead of realtime/SSE — no event taxonomy entry needed if
  the product spec explicitly says "self-navigate" (ADR amendment), not live push.
- Domain errors from the mutation (stale-state races like `already-sealed`,
  `no-pending-request`) → `toast.error`. But an error that's a **direct, synchronous
  consequence of the action just taken inside an open dialog** (e.g. "you can't confirm
  your own request") → inline dialog error, not a toast (toast can be missed if the dialog
  auto-closes).
- Mutation variables should capture the selector/key at the moment the confirm-dialog
  opened (not re-read live searchParams inside `mutationFn`) — protects against the
  selector changing while a mutation is in flight.

## RSC-resolved identity vs client-derived display name

When `page.tsx` needs a "current user" value for a client feature that already queries a
directory list containing that user (e.g. `tenant-admins`): resolve only the **ID**
server-side (cheap — `decodeSubClaim(accessToken)` from `bootstrap/lib/jwt.ts`, no extra
request) and let the **display name** be derived client-side via
`list.find(x => x.id === currentId)?.name` once that query settles, rather than adding a
second server round-trip just for a cosmetic label. Only resolve the name server-side if
it gates something before the client query can run.

**See also:** [[rsc-readonly-pattern]]

## RSC-seeded useInfiniteQuery + draft/applied URL filters (US-E12.12, audit-log)

First screen combining RSC-prefetch with `useInfiniteQuery` (no `HydrationBoundary`/
`dehydrate` anywhere in this repo — confirmed by repo-wide grep, zero matches). Pattern:
`page.tsx` calls the DI use-case directly for page 1 of the filter derived from initial
`searchParams` (same as `admin/staff-leave`/`admin/calendar` non-Query RSC pattern), maps to
`{ filter, events, nextCursor, hasMore, loadFailed }`, passes as a prop. Client container
seeds `useInfiniteQuery`'s `initialData` (`{ pages: [...], pageParams: [null] }`) **only**
when the current `appliedFilter` (from `useSearchParams()`) structurally matches the
RSC-rendered filter and `loadFailed` was false; otherwise runs a normal client fetch.

**Filter-key-drives-reset, not manual reset**: for any list with filter-driven cursor
pagination, put the applied filter directly in the query key
(`keys.list(appliedFilter)`); never manually clear/reset `pages` on filter change — a
distinct key is a fresh, empty infinite-query cache entry automatically, which is also
what prevents "load more" from ever appending across a filter change.

**Draft vs applied filter split** (matches a design mockup's explicit "Tìm kiếm" search
button rather than live-as-you-type filtering): draft = local component state in the
filter bar (not shared, changes every keystroke); applied = synced to URL search params
on submit, and it's the URL-derived value (read fresh from `useSearchParams()` every
render, never mirrored into a separate `useState`) that the query key reads. Rationale:
avoids a refetch storm per keystroke, keeps filters shareable/back-button friendly per
CLAUDE.md's URL-state guidance, and the query key naturally resets on submit.

**Load-more error must not blank prior pages**: `useInfiniteQuery`'s `isError` reflects
page-1 status; a failed `fetchNextPage()` for page N does not clear `data.pages` — give
`LoadMoreButton` its own inline retry affordance (distinct from the full-page
`ErrorBanner` used for a first-page failure) so already-rendered rows visibly persist.

## Course/lesson hierarchy + cross-query optimistic patch (US-E11.6, lms feature)

For a two-screen list→detail flow (courses grid + lesson player) where a
detail-screen mutation (mark lesson complete) must also update a summary
field cached under a *different* query key (course progress in the list):

```ts
lmsKeys = {
  all:           ()                 => ["lms"]                                as const,
  coursesList:   ()                 => ["lms", "courses", "list"]             as const,
  courseLessons: (courseId: string) => ["lms", "course", courseId, "lessons"] as const,
  note:          (lessonId: string) => ["lms", "lesson", lessonId, "note"]    as const,
  questions:     (lessonId: string) => ["lms", "lesson", lessonId, "questions"] as const,
}
```

- **Client-side tabs filtering an already-fetched full list → do NOT put the
  filter in the query key.** If the RSC/repo always returns the full
  unfiltered set and tabs just filter in-memory (`useMemo`), a
  status-parameterized key (`["courses", {status}]`) would create redundant
  cache entries needing separate fetches per tab for no benefit. Only key by
  filter when the filter actually drives a distinct server request (e.g.
  cursor-paginated lists per `api-integration.md`).
- **Cross-query optimistic patch, no `invalidateQueries` on success**: when a
  mutation needs to update two related caches (detail + summary-in-a-list),
  patch BOTH directly with `setQueryData` in `onMutate` (snapshot both first
  for rollback), then patch again with server-confirmed values in
  `onSuccess`. Avoid `invalidateQueries` here — a background refetch racing
  the mutation's own commit (mock latency simulation, or real-BE eventual
  consistency) can flicker the UI back to pre-mutation state. Only fall back
  to invalidate once there's a genuine reason the cache can't be safely
  computed client-side.
- **Reuse the same domain pure-fn on both sides**: if a use-case computes a
  derived value server-side (e.g. `calculateCourseProgress(done, total)`),
  import that exact fn client-side for the optimistic patch too (domain/ has
  zero framework deps → confirmed client-bundle-safe) rather than
  reimplementing the formula in the presentation layer — prevents drift bugs.
- **Explicit-save form fields (no autosave) don't need optimistic
  `setQueryData`**: when an AC explicitly calls for a "Lưu"/Save button (not
  live-typing sync), skip `onMutate` entirely — just `onSuccess: (saved) =>
  setQueryData(key, saved)`. The local textarea `useState` draft already gives
  instant UI feedback; optimistic cache writes add rollback complexity for no
  UX gain when nothing else reads that key concurrently.
- **Idempotent mutation re-trigger**: when a UI already disables the trigger
  after success (e.g. "mark complete" button becomes disabled), model
  repeated calls as a no-op success rather than inventing an
  `already-complete` failure variant — simpler contract, and the disabled
  button makes the race vanishingly rare anyway.

**Server Action result shape with `retryable`**: when the query layer needs to decide
retry eligibility (`error.retryable === true` per api-integration.md), the Server Action
must return it explicitly (`{ ok: false, errorKey, retryable }`), not just a bare
`errorKey` string — the client can't otherwise recover `ApiError.retryable` through a
Server Action boundary.

## Multi-region dashboard, independent-failure isolation + polling (US-E03.1, principal reports)

First feature with `refetchInterval`-based polling in this repo (confirmed by
repo-wide grep — zero prior usage). Pattern for an N-region dashboard where
each region must fail/load/empty independently and one term/filter selector
drives all of them:

```ts
principalReportsKeys = {
  all:             ()             => ["principal", "reports"]                         as const,
  summary:         (termId: Term) => ["principal", "reports", "summary", termId]       as const,
  subjectAverages: (termId: Term) => ["principal", "reports", "subject-averages", termId] as const,
  attendanceTrend: (termId: Term) => ["principal", "reports", "attendance-trend", termId] as const,
  list:            (termId: Term) => ["principal", "reports", "list", termId]          as const,
}
```

- **Partial-failure isolation (N independent regions) = N independent
  `useQuery` calls, full stop.** Do not combine them into one query/one
  `Promise.all` — that's what would create a race/isolation problem in the
  first place. Each region maps its own query result to a shared
  `{ status: 'loading'|'error'|'empty'|'success', data, onRetry }` prop shape
  so leaf components stay `useQuery`-free (Storybook-friendly, matches the
  fe-component-architect boundary contract).
- **Stale-response discard on rapid filter switch (e.g. term A→B→C before A
  resolves) is solved natively by putting the filter IN the query key** —
  distinct keys are distinct cache entries; a late response for the
  no-longer-selected value updates only its own (now unobserved) cache entry
  and can never bleed into what's rendered for the currently-selected one.
  No hand-rolled `AbortController`/ignore-flag needed.
- **Explicit gap to avoid: do NOT set `placeholderData: keepPreviousData`**
  (or v4's `keepPreviousData: true`) on filter-keyed queries whose spec wants
  a fresh skeleton per filter change (not a stale-value flash while the new
  key loads). This option is a common TanStack recommendation for
  pagination/filters generally, but it directly contradicts a
  "show skeleton, then re-render" requirement — call this out explicitly in
  any state-design doc rather than assuming it's a safe default add.
- **Poll loop**: `refetchInterval: (query) => <predicate over query.state.data>
  ? INTERVAL_MS : false`. Extract the predicate into a standalone **pure
  function** unit-tested with plain data fixtures (no timers) rather than
  attempting a `renderHook` + `vi.useFakeTimers()` + live `QueryClient`
  integration test — no precedent in this repo for that combo, and
  TanStack's internal scheduling is known to interact unreliably with faked
  timers. Prove the actual data-transition-over-time (e.g. "generating" →
  "ready") at the mock-repository layer instead, via an injected `now: () =>
  number` clock (no real timers, per `tdd.md`) — that's where the
  time-dependent logic actually lives, not in the query hook.
- **`refetchIntervalInBackground` left at default `false`** for a
  Should-priority polling feature — pauses while tab hidden, catches up on
  refocus; avoids justifying background network usage for a non-critical
  status transition.
- **Mutation with no optimistic update, by deliberate choice**: when a new
  row's very first optimistic-rendered state would be visually identical to
  the eventual server-confirmed state (e.g. a "generating" placeholder row),
  skip `onMutate` entirely — invalidate-on-success only. This makes a "no
  ghost row on failure" AC trivial (nothing was ever added to cache) instead
  of something to get right in `onError`/rollback logic. Contrast with
  [[query-key-conventions]]'s discipline `recordViolation` example, which DOES
  optimistically prepend — the difference is whether the optimistic and
  confirmed states are visually distinguishable/worth the latency win.

See also: `docs/stories/epics/E03-principal-reports/US-E03.1-principal-reports-dashboard/state-design.md`
for the full write-up (RSC↔client boundary, invalidation map, race-condition
table).
