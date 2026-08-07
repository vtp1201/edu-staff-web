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
7. **Un-mocked read whose failure is swallowed in `page.tsx`** (US-E18.52). The E18
   signature defect: a force-mocked method that could never fail becomes a real
   fallible read, the repo carefully "fails closed" with a new failure type + a new
   `errors.<type>` i18n key in vi+en — and `page.tsx` still does
   `result.ok ? result.value : []`, so the user sees an empty list, not the error.
   GREP TEST: every new `errors.*` key added by an un-mocking story must appear in a
   `t(...)`/`tErrors(...)` render path, and the newly-fallible surface needs empty AND
   error states (they were unreachable while mocked, so they usually don't exist).

8. **Newly-real WRITE whose only UI caller is gated behind a still-mock READ**
   (US-E18.50). In a PARTIAL un-mock, check reachability of every newly-real mutation
   in REAL mode, not just its repository test: `deleteGroup`→archive was wired real
   while `getGroup` stayed mock, and the archive button lives inside the
   `!isLoading && group` branch of `group-info-panel.tsx` — for a real room id the mock
   read 404s, `group` is `undefined`, the panel renders a permanent "…" and the archive
   affordance never mounts. GREP TEST: for each method moved mock→real, find its UI
   caller and ask "what feeds the data this caller is gated on, in real mode?"
   Related: swallowed reads (`res.ok ? res.value : undefined`) turn this into an
   infinite fake-loading state rather than an error.

Verified clean conventions worth not re-litigating: role-discriminated VM unions
(`viewerRole` field, absent action = compile error), capability-as-presence for
affordances, throwing repositories + failure-union mapping by `error.code`.
