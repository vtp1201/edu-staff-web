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

## Stat-counts-embedded-in-list-response → broad list invalidation (US-E19.2, moderation)

When a list endpoint's response embeds a derived summary/stat object (e.g.
`GET /reports` returns `{ reports[], stats: { pendingCount, ... } }`) rather than
exposing stats via a separate endpoint, **any mutation that changes an item's
status must invalidate the entire `keys.lists()` subtree** (every cached
filter/tab variant), not just `keys.list(activeFilter)` or `keys.detail(id)`.
Reason: every filter variant's cached page carries its own now-stale copy of
`stats` — busting only the active tab leaves other already-visited tabs (and
their StatCards) stale until a hard refresh. This is the resolution to a
common "planner flags stats delivery as an open BE question" scenario — the
invalidation-breadth decision does not need to wait for BE confirmation of
*where* stats come from, only needs stats-are-embedded to be the working
assumption (mock-first safe).

**Never-optimistic mutation's `onError` still invalidates on the specific
409/already-resolved-style race branch** — "never optimistic" (no
`onMutate`/pre-emptive `setQueryData`) is a distinct rule from "never
invalidate on error." When a 409 means someone else's concurrent action
already changed server state (a real state change, not this mutation's own
failure), the `onError` handler for that specific error branch should still
invalidate `lists()`/`detail()` so the UI reflects the actual current state —
only the 403/forbidden and transient-error branches invalidate nothing (content
must stay exactly as it was pre-mutation there).

**Detail/sheet queries needing zero-stale-tolerance** (e.g. a 404 must never
render cached/stale content per an explicit AC): `staleTime: 0` + default
refetch-on-mount, rather than a manual `removeQueries` call on every open —
simpler and equally correct since the query naturally refetches each time
`enabled` flips true.

**Read-only compliance/audit-trail queries** (no realtime/SSE requirement in
scope): a short `staleTime` (~15s) is enough to make a just-performed action's
audit entry visible on next tab visit; don't reach for polling or SSE unless
the spec explicitly requires live cross-session push (see the "self-navigate,
not live push" precedent in the academic-record-seal entry above) — eager
`invalidateQueries` from the triggering mutation, not staleTime expiry, is what
actually guarantees a fresh fetch on next mount.

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

## Per-tab COLD refetch vs. client-filter-of-one-list — decide by AC wording, not by sibling precedent (US-E11.7, lms/student-assignments)

Two screens in the same `lms` feature made **opposite** calls on "does a tab
switch trigger a real fetch or just filter an already-cached list":
- US-E11.6 `student-courses-screen.tsx` (3 tabs): client-filter, single
  `coursesListKey()`, `useMemo` filter — correct there because its AC never
  claimed a per-tab loading cycle.
- US-E11.7 `student-assignments` (4 tabs): REAL per-tab query
  (`assignmentsKeys.list(tab)`), because its own AC (AC-1171.9) explicitly
  said "the previous list **unmounts**... independent loading→state **cycle
  begins**" and AC-1171.1 said "**the active tab's fetch** is pending" —
  wording a BA doesn't use casually when a client-filter precedent already
  existed to imitate.

**Rule of thumb**: don't default to copying a sibling screen's tab-filtering
pattern just because it's in the same feature module. Read the literal AC
verbs — "unmount"/"independent cycle"/"the active tab's fetch" signal a real
per-tab query is intended; plain "shows only matching items" signals a
client-side filter is fine. When the AC does want a real per-tab cycle:
- Key the subtree by tab (`key={activeTab}` on the list-rendering region) so
  React actually unmounts the previous tab's `useQuery` instance.
- `gcTime: 0` on every non-default tab (and even the default, once it
  unmounts) — guarantees a cold fetch (real loading state) on every
  re-activation, not just the first. `staleTime: 0` to match.
- RSC-seeded default tab keeps a modest `staleTime` (e.g. `30_000`) so first
  paint doesn't immediately background-refetch and waste the RSC round trip.
- Mutation-driven cache update in this shape: patch the *currently active*
  tab's cache directly with the mutation's own returned entity (cheap,
  no drift), then `invalidateQueries({ queryKey: keys.lists(), refetchType:
  "inactive" })` for the other 3 — cheap/no-op given they're `gcTime:0`
  evicted already, just defense-in-depth. Do NOT hand-roll the other 3 tabs'
  filter predicates client-side (drift risk vs. the mock/BE's own filter
  logic) and do NOT do a blanket active-refetch invalidate (causes a visible
  post-mutation skeleton flicker for data you already have).

See full write-up: `docs/stories/epics/E11-lms-exams/US-E11.7-student-assignments/plan.md` §13.

## Mock-first no-HTTP mutation still modeled as `useMutation`, not a bare reducer (US-E19.1, social feed pin/unpin)

When a feature has a client-only, "never persists, cannot fail" toggle (e.g.
pin/unpin mock-first behind `IFeedRepository.togglePinMock`, INT-190-07, BE
endpoint not shipped yet): still model it as `useMutation` with a **no-op
`mutationFn`** (calls the thin Server Action which calls the mock repo method,
returns synchronously-ish) + `onMutate`/`onError` writing directly into the
SAME list query cache other real mutations touch (`setQueryData`), rather than
a parallel `useReducer`/local state duplicate of post data. Reasons: (1)
uniform mental model — one cache is the single source of truth for post state,
no drift between "the pin flag" and "the rest of the post fields"; (2) if a
`select`-level derived sort (e.g. pinned-first) reads the SAME cache, flipping
`pinned` via `setQueryData` automatically re-triggers `select` and re-sorts —
no second manual re-sort call; (3) the "must not survive full reload" AC
requires **zero extra code** — it's just what already happens by not
persisting anywhere durable (localStorage/cookie) — do NOT add any such sync,
that would silently violate the non-persistence AC.

**Never-optimistic destructive-remove precedent generalizes across features**:
`moderation-screen.tsx`'s established "remove is never optimistic, invalidate
only" rule (see the entry above) was directly reused, unmodified, by a SECOND
feature (feed) that delegates to the SAME `makeRemoveContentUseCase()` — when
a new feature's mutation calls an EXISTING cross-feature use-case/action that
already has an established optimistic-or-not convention in its owning
feature's container, inherit that convention rather than re-deciding per
consuming feature. Consistency of a shared destructive action's UX (does it
flash-then-rollback, or wait-then-refetch) matters more than a small latency
win for a moderator-only, low-frequency action.

**Cross-feature repository signature gap surfaces at the consuming feature,
not the owning one** — `IModerationRepository.removeContent()`'s
`RemoveContentRepoInput.reportId` is a REQUIRED field because its only
existing caller (`moderation-screen.tsx`) always operates from within a report
detail context. A second consumer (feed) that wants to remove content
directly, with no report in scope, exposes that the field should probably be
optional — this is a real signature/data-contract issue to flag to `fe-lead`
(and the owning feature's team) before wiring, not something to route around
by inventing a placeholder value. Watch for this shape of gap whenever a
"thin action wraps an existing cross-feature use-case" reuse pattern
(`.claude/CLAUDE.md`'s Reuse ledger convention) is used from a second call
site with a different precondition than the first.

See full write-up: `docs/stories/epics/E19-social/US-E19.1-social-feed/state-design.md`.

## "Already published"-style race: invalidate + forced active refetch + explicit form `reset()` bridge, NOT a persistent local lock flag (US-E11.8, lesson-plan)

When a save/publish mutation can fail because another actor already
transitioned the resource server-side (e.g. `LESSON_PLAN_ALREADY_PUBLISHED`
on a DRAFT-only `PUT`), and the read-only/locked rendering is **already**
specified elsewhere as a pure function of the entity's own status field
(e.g. `status === "PUBLISHED"`), do NOT add a second, independent
"force-locked" boolean to represent the same fact — that creates two sources
of truth that must be hand-synced. Instead:

1. `onError` for that specific failure branch: `invalidateQueries({ queryKey:
   detail(id), refetchType: "active" })` (explicit, even though `"active"` is
   already the v5 default — states intent/audit trail) to pull canonical
   server state.
2. A `useEffect` (or equivalent) watching the detail query's `data.status`
   calls `form.reset(mapEntityToFormValues(data), { keepDirty: false })` the
   moment the real transition is observed — react-hook-form does **not**
   auto-resync fields to a query's background-refetched data by design (that
   safety is what makes RHF safe during normal in-progress typing), so
   invalidation *alone* updates the cache but leaves stale-looking editable
   fields on screen until this explicit bridge runs.
3. The only NEW local state this adds is a short-lived "race banner visible"
   boolean purely for the error-message UI — never consulted to decide lock
   state; lock state always derives from the query data, keeping FR-005-style
   "is this locked" checks singular across the codebase.

Generalizes to any one-way-transition write (publish, seal, approve) that
already has a spec'd pure-status-driven read-only view AND a form that seeds
its `defaultValues` once from that same query on mount.

## Cross-feature read-only reference-data query key — keep it feature-neutral, not scoped to the first consumer (US-E11.8)

When a NEW feature's client-side picker/select becomes the **first**
`useQuery` consumer of an existing repository/DI factory that another
feature already owns server-side only (e.g. `ISubjectCatalogueRepository` /
`makeSubjectCatalogueRepository()`, previously consumed only by an RSC-only
admin screen with zero client query keys), name the query key after the
**shared resource**, not the new feature (`["subject-catalogue", "options"]`,
not `["lesson-plan", "subject-options"]`). Reasoning: a second future client
consumer of the same repository should share the cache entry, not duplicate
it under a different feature's namespace. Confirm first (grep the owning
feature's `presentation/`) that no query-key convention already exists there
to collide with or that should be reused as-is instead of minted fresh.
