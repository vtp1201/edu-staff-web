---
name: pattern-client-searchparams-nav
description: Client screen drives RSC re-fetch via searchParams (class/year selector) with optional override props for Storybook
metadata:
  type: feedback
---

For an admin screen whose selectors (class, year, etc.) must re-fetch server data,
the `'use client'` screen owns the navigation: `useRouter` + `usePathname` +
`useSearchParams`, push `${pathname}?classId=...`. The RSC `page.tsx` reads
`searchParams` (a Promise — `await` it), validates against the static set, falls
back to a default, fetches via the DI use-case, builds the VM, and renders.

**Why:** keeps the page a thin RSC fetch boundary while the interactive selector
lives client-side; no client→infrastructure import. Mirrors how the roster page
reads `classId` from searchParams.

**How to apply:** expose `onSelectClass?`/`onSelectYear?` as OPTIONAL props that
default to the searchParams-nav callbacks. Storybook passes no-op overrides so
the router (which Storybook only stubs) is never actually invoked — the hooks
still render fine under the `@storybook/nextjs-vite` framework.

Also: build the VM in a PURE client-safe builder module (`build-*-vm.ts`) that
takes domain `TimetableData` + ids → VM, enriching with static reference data.
Reused by both `page.tsx` (RSC) and the story. See [[pattern-mock-first-wiring]].
