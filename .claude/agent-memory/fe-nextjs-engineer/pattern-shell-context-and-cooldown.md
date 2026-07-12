---
name: pattern-shell-context-and-cooldown
description: US-E22.1 email-verify — AppShell can't use TanStack Query (Context instead); framework-free timer + useSyncExternalStore; server-action-as-prop for Storybook-safe presentation
metadata:
  type: project
---

Patterns confirmed while building US-E22.1 (email verification: shell banner +
Profile row + OTP dialog). All reusable for future shell-level reactive features.

**AppShell / ReactQueryProvider boundary.** `layout.tsx` wraps only `{children}`
in `ReactQueryProvider` and passes it as `AppShell`'s `children` prop. `AppShell`'s
OWN JSX (Header, banner slot, Sidebar) is a *sibling* of that provider, NOT a
descendant → a component mounted directly in `AppShell` (e.g. a shell banner) has
NO `QueryClient` in its tree and cannot use `useQuery`. Fix: a plain React Context
(`EmailVerifyProvider`) mounted in `AppShell` wrapping its whole return value.
Seed it once from an RSC fetch (see below). Not a global store, no ADR needed.

**First real `GET /users/me` in the shell.** Before this story `layout.tsx` only
decoded JWT claims + hardcoded `userName`, and `ProfilePage` used a MOCK. Added
`makeGetProfileUseCase()` (DI factory, `ensureFreshSession()` first) →
`getProfile(): ProfileResult` (narrow `{data:AuthUser}|{error}`, NOT `AuthResult`
which bundles tokens). `layout.tsx` threads a **tri-state** `emailVerified:
boolean | null` (null on fetch error → banner fail-closed). Watch `null ?? false`
collapsing the tri-state — use `x === undefined ? false : x`.

**Framework-free timer, node-env testable.** For a shared countdown: extract a
`CooldownController` class (no React) with `start()`/`getRemaining()`/`subscribe()`
using `setInterval`; unit-test it with `vi.useFakeTimers()` + an injected `now()`.
The hook is a thin `useSyncExternalStore(subscribe, getRemaining, getRemaining)`
binding. Avoids `renderHook` (unavailable in node env). `start()` must reset
unconditionally (Resend mid-cooldown = fresh window).

**Server-action-as-prop (Storybook-safe presentation).** Presentation components
(banner, dialog) take server actions as OPTIONAL PROPS and never import the
`"use server"` module — importing it pulls the server-only DI chain into the
Storybook/client bundle and breaks it. `AppShell`/`page.tsx` (server boundary)
import the actions and pass them down. `import type` of the action's result type
is fine (erased). Matches the repo convention (login/forgot/profile all do this).

**Biome + Storybook gotchas.** `role="group"` on a `<div>` trips
`a11y/useSemanticElements` → use `<fieldset>` (implicit role=group) with a styling
reset (`m-0 border-0 p-0`). Entrance animations (`motion-safe:animate-in fade-in`)
make `toBeVisible()` flaky in the browser runner → assert `toBeInTheDocument()`.
Radix dialog content is portalled → query it via `within(document.body)`.
