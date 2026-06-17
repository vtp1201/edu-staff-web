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

**See also:** [[rsc-readonly-pattern]]
