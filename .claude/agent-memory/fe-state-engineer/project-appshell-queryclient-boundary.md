---
name: project-appshell-queryclient-boundary
description: AppShell/ReactQueryProvider tree boundary — TanStack Query is NOT reachable from components mounted directly in AppShell's own JSX; documents when a plain React Context is the correct exception to "no global store"
metadata:
  type: project
---

`src/app/[locale]/t/[tenant]/(app)/layout.tsx` mounts
`<AppShell>{ <ReactQueryProvider>{children}</ReactQueryProvider> }</AppShell>`.
`AppShell`'s own JSX (Header, the banner slot next to `SseDisconnectBanner`
at `app-shell.tsx` ~line 81, Sidebar) is a SIBLING of `ReactQueryProvider`,
not a descendant — `ReactQueryProvider` only wraps the `children` prop value.
Any component mounted directly inside `AppShell` (not inside `{children}`)
has no `QueryClient` in its React tree and cannot use `useQuery`/`useMutation`.

**Why:** confirmed while designing US-E22.1 email-verification state
architecture — `EmailVerifyBanner` needed to mount in `AppShell` (same slot
as `SseDisconnectBanner`) but also needed to share live state
(`emailVerified`, cooldown timer) with `EmailVerifyDialog`, which mounts
inside `{children}` (inside `ReactQueryProvider`). TanStack Query wasn't
reachable from the banner's mount point, so a query-based approach was a
non-starter regardless of preference.

**How to apply:** when a future feature needs shell-level shared state
readable both by something mounted directly in `AppShell` and something
mounted inside its `{children}`, a plain React Context (mounted in `AppShell`
around its ENTIRE return value, not just around `{children}`) is the correct
exception to "no global store," provided: (1) the state is small/UI-local
(booleans, a string, a derived timer — not a server-data cache needing
invalidation semantics), (2) it's seeded once from RSC-fetched data (no
client refetch loop), (3) it's scoped to one subtree (not app-wide
business state). This is NOT a case for spinning up a second
`QueryClientProvider` above `AppShell` — that would fragment the cache for
data that isn't cache-shaped in the first place. No ADR was required for
this call (not a global client store in the Zustand/Redux sense — same
category as the existing `useSidebarCollapsed` local-state hook, just needs
Context instead of a hook because two different mount points need one
shared instance).

See also: `docs/stories/epics/E22-email-verification/US-E22.1-email-verification/plan.md`
§"State Architecture Sign-off (fe-state-engineer)" for the full contract
(`EmailVerifyProvider`, `useEmailVerifyCooldown`, `ProfileResult` type).
