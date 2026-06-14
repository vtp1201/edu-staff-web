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

**When TanStack Query IS appropriate:**
- Client needs to refetch (polling, pull-to-refresh)
- Optimistic mutations that need cache rollback
- SSE-driven `invalidateQueries`
- Shared query result across multiple client components at different tree depths

**See also:** [[query-key-conventions]]
