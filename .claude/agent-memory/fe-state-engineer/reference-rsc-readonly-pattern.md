---
name: rsc-readonly-pattern
description: When to skip TanStack Query entirely — use RSC async component + ViewModel props for pure read-only server data
metadata:
  type: reference
---

For screens that are **purely read-only with no client-triggered refetch, no mutations, and no realtime invalidation**, the correct pattern is:

1. RSC async component calls use-case server-side (`await makeXxxUseCase().execute()`)
2. Maps domain result to a typed ViewModel (`.i-vm.ts`)
3. Passes ViewModel as props to a `'use client'` component
4. No TanStack Query on the client — no `useQuery`, no query keys, no cache

**Why:** Adding TanStack Query introduces a waterfall (RSC → hydrate → client query → render) and a client bundle cost with zero benefit when data is static per-request.

**Confirmed canonical examples in this repo:**
- `TeacherDashboard` (RSC async component in `features/teacher/presentation/teacher-dashboard.tsx`)
- `classes/page.tsx` + `[classId]/students/page.tsx` (US-E13.1)
- `StaffLeaveScreen` (US-E09.3) — RSC seeds `initialRequests` prop; client holds local `useState` copy and patches it on Server Action success (local-first mutations, no cache rollback needed for mock-first)

**RSC + local mutation variant (mock-first admin screens):**
When a screen has mutations but no BE yet, the correct pattern is:
1. RSC fetches and passes `initialRequests` as prop
2. Client `useState(initialRequests)` owns the mutable copy
3. Server Action returns `{ ok: true } | { ok: false, errorKey }` — no TanStack mutation
4. On success: patch `requests` item in-place; show toast
5. On error: show error toast with `t(errorKey)`; do NOT patch
6. No snapshot/rollback — patch only on confirmed success
7. Upgrade path to true optimistic: replace `useState` with `useQuery(initialData)` + `useMutation(onSettled: invalidate)` when BE ships

**When TanStack Query IS appropriate:**
- Client needs to refetch (polling, pull-to-refresh)
- Optimistic mutations that need cache rollback
- SSE-driven `invalidateQueries`
- Shared query result across multiple client components at different tree depths

**See also:** [[query-key-conventions]]
