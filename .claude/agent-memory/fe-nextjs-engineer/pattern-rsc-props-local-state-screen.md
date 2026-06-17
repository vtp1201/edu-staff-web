---
name: pattern-rsc-props-local-state-screen
description: Mock-first multi-tab action screens use RSC-prefetched props + local useState/useTransition, not client TanStack Query
metadata:
  type: feedback
---

For mock-first feature screens (class-log, discipline US-E09.1), the established
repo pattern is **RSC page pre-fetches all data → passes as VM props → client
screen holds it in `useState` + mutates optimistically + calls Server Actions
via `useTransition`**. NOT client-side TanStack Query.

**Why:** mock-first means no real cacheable remote data; the class-log screen
(the canonical reference) does exactly this. A state-design.md packet may
*propose* TanStack Query + query keys, but the repo reality (and the simpler,
shipping pattern) is RSC props + local state. When the brief says "follow
class-log" that overrides the packet's query-key plan.

**How to apply:** page.tsx (RSC) `Promise.all` the get-use-cases, soft-fail to
`[]` on throw (empty/error states render), compute derived props (availableClasses).
Screen takes a VM with data arrays + Server Action refs returning `{ errorKey? }`.
Tabs driven by `?tab=` searchParams with an optional `onTabChange` prop override
so Storybook avoids the Next router. Add optional `isLoading` / `loadErrorKey` /
`onRetry` to the VM for the skeleton + error-banner states (AC loading/error)
even though RSC pre-fetch means they're rarely true in-app — Storybook needs them.
See [[pattern-throwing-repo-failure]] for the action catch→errorKey boundary.
