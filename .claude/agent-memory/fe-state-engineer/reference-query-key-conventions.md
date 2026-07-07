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

**Server Action result shape with `retryable`**: when the query layer needs to decide
retry eligibility (`error.retryable === true` per api-integration.md), the Server Action
must return it explicitly (`{ ok: false, errorKey, retryable }`), not just a bare
`errorKey` string — the client can't otherwise recover `ApiError.retryable` through a
Server Action boundary.
