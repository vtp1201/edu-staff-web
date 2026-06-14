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

No confirmed `staleTime`/`gcTime` defaults yet established for this repo (as of US-E13.1 — first story where TanStack Query was evaluated and deferred). When the first client-side query is added, establish and record here.

## Invalidation pattern

On `onSettled` of a mutation: `queryClient.invalidateQueries({ queryKey: featureKeys.lists() })` to bust all list variants. Use `detail(id)` for targeted single-item bust.

Only retry when `error.retryable === true` (from `ApiError`). Never retry 401/403.

## List endpoints (cursor pagination)

List endpoints use `meta.pagination.nextCursor` / `hasMore`. Model with `useInfiniteQuery` on the client if pagination is needed client-side. For server-side full drain, use `fetchAllPages()` helper (exists in `TeacherDashboardRepository`).

**See also:** [[rsc-readonly-pattern]]
