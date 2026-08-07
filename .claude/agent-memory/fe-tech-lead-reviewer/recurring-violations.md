---
name: recurring-violations
description: Defect classes I keep flagging in edu-staff-web reviews — check these first on any FE story
metadata:
  type: project
---

Defect classes worth checking FIRST on every `/fe` review in this repo.

**Why:** each of these has cost ≥1 extra engineer round; they are cheap to grep for
and expensive to miss.
**How to apply:** run these greps/checks before reading the diff narratively.

1. **Route reachability of a role-gated affordance** (US-E18.44, 3 rounds). RBAC logic
   being correct is NOT enough — trace nav entry (`src/components/layout/app-shell/sidebar/nav-config.ts`)
   → route guard layout (`(app)/<ns>/layout.tsx`, strict-equality role) → component mount.
   An affordance mounted on a route the authorized role is redirected away from is
   fail-closed but useless. Prefer reusing an already-nav-linked route over a new one.
2. **`{ raw: true }` nesting.** Must be a CONFIG-level sibling of `params`, never inside
   `params` — nested it becomes a query string and `meta.pagination` is lost.
   Assert the exact `http.get(PATH, { params, raw: true })` call in the repo test.
3. **RBAC on READS, not just writes.** Tenant-wide oversight/rollup reads need
   `requireRole(...)` BEFORE any DI/HTTP call, same as mutations.
4. **RSC-seeded prop → `useState(seed)` with no sync-on-change** (US-E18.46). A list
   seeded from an RSC prop goes permanently stale after a successful mutation, because
   `revalidatePath` + `router.replace` re-renders but `useState` ignores the new prop.
   Repo idiom for the fix is the render-phase key sync used for `sheet` in
   `grade-entry-screen.tsx` (`syncKey !== key → setState`).
5. **`hasMore: true` with a null `nextCursor`.** Load-more handlers that pass a null
   cursor usually re-fetch page 1 and REPLACE the accumulated list. Guard on
   `hasMore && cursor !== null`.
6. **RSC handing a locally-defined closure as a Server Action prop** — `tsc`, `build`
   and Storybook all miss it; only a unit test that INVOKES the prop catches it.

Verified clean conventions worth not re-litigating: role-discriminated VM unions
(`viewerRole` field, absent action = compile error), capability-as-presence for
affordances, throwing repositories + failure-union mapping by `error.code`.
