---
name: gotcha-terminal-error-vs-skeleton
description: `isLoading || !data → <Skeleton/>` renders FOREVER once a query errors terminally (isLoading false, data undefined) — thread isError down and show the unavailable marker; decide with a pure mode() helper
metadata:
  type: feedback
---

**Rule: never gate a skeleton on `isLoading || !data`.** Thread the query's
`isError` into the presentational component and decide with a pure helper:
`hasData → ready` (stale-but-real beats blanking on refetch) → `hasError →
unavailable` → `isLoading → loading` → else `unavailable`.

**Why:** after a TanStack query settles in error — non-retryable (`forbidden`,
which is reachable in production whenever a role is missing from a BE RBAC
allow-list) or past its retry budget — `isLoading` is `false` while `data` stays
`undefined` forever. The skeleton then renders permanently and reads as "still
loading" when the truth is "this failed". That is the same lie as rendering `0`
for a count you never received (US-E18.32 review MUST-FIX; the story had already
banned zeros via `initialStats: null`, then re-introduced the lie one layer up).

**How to apply:** render the existing unavailable marker (em-dash +
`sr-only` text) in the VALUE slot — widening a shared card's `value` prop to
`React.ReactNode` is backwards-compatible and cheaper than a parallel component.
The pure `mode()` helper is the TDD surface (node env, no DOM needed); pair it
with ONE story where the read fails terminally while its siblings succeed, to
prove the surface degrades on its own rather than failing the screen.

Related: [[pattern-force-mock-vs-honest-degrade]],
[[pattern-composite-key-pointread-and-unbacked-read]].
