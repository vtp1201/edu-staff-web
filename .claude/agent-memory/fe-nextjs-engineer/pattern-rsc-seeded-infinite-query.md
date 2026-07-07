---
name: rsc-seeded-infinite-query
description: RSC prefetch page 1 → seed useInfiniteQuery initialData + URL-applied/local-draft filter sync (cursor pagination screen)
metadata:
  type: project
---

Cursor-paginated admin list screen (first built US-E12.12 audit-log) that combines
RSC prefetch with client `useInfiniteQuery` — the repo has NO `HydrationBoundary`
anywhere, so this is the sanctioned substitute.

**Why:** need append-page cache semantics (TanStack) AND no first-paint skeleton flash
for the default view. **How to apply:**

- RSC `page.tsx` reads `searchParams` (Promise in Next 16), builds the initial filter,
  calls `makeXxxUseCase()` directly, maps `Result` → a plain VM prop
  `{ initialFilter, initialPage:{events,nextCursor,hasMore}, initialErrorKey, action }`.
  No translation at this boundary (`initialErrorKey` is a stable key, not copy).
- Client container: `appliedFilter` derived from `useSearchParams()` (single source of
  truth — do NOT mirror it in useState). `useInfiniteQuery` keyed `["x","list",appliedFilter]`
  — changing the key IS the page reset (no manual reset). `queryFn` calls the Server
  Action; on `!ok` throw `{type,retryable}` so `isError`. `getNextPageParam` from
  `lastPage.data.hasMore ? nextCursor : undefined`. `retry:(n,e)=>Boolean(e.retryable)&&n<2`.
- Seed `initialData` ONLY when `filtersEqual(appliedFilter, initialFilter) && !initialErrorKey`:
  `{ pages:[{ok:true,data:initialPage}], pageParams:[null] }`. Deep-linked non-default
  filters show the loading skeleton (acceptable).
- **Draft/applied filter split:** local `useState` draft = responsive input mirror;
  effect resyncs draft from `appliedFilter` (back/forward); a second **debounced** effect
  writes `filterToQueryString(draft)` → `router.replace` (only when it differs from
  applied). Avoids per-keystroke query storm while honoring immediate-apply FilterBar
  contract. Pure `filter-search-params.ts` (parse/serialize/equals) is unit-tested.
- Flatten at render only: `data?.pages.flatMap(p=>p.data.events) ?? []`.

Cursor stays infra-only (opaque `offset:N` in the mock repo); never leaks into domain
`AuditEvent`. Repo `Result<T> = {ok,value}|{ok,error}` (staff-leave style, `.value`);
action returns `{ok,data}|{ok:false,errorKey,retryable}` (retryable derived from the
failure type via `isRetryableFailure`).

Storybook: `nextjs:{appDirectory:true}` auto-mocks next/navigation (useSearchParams empty,
router noop → filter-change interactions don't re-query in SB; drive filter *views* via
seeded `initialPage` instead). `vitest:storybook` runner WORKS now (my older "broken
env-wide" note is stale for SB 10.4.2) — but ~17 established story files fail at baseline,
so grep your own file out of the failure list rather than assuming you broke something.
