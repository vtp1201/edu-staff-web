---
title: State Architecture — US-E23.1 Tenant Switch Menu
author: fe-state-engineer
status: final (pending fe-lead sign-off on the Critical Finding in §0)
lane: high-risk
inputs:
  - plan.md (fe-planner, primary input — this doc finalizes/verifies, does not redesign)
  - spec.md, story.md
  - verified this session: src/app/[locale]/t/[tenant]/(app)/layout.tsx,
    src/app/[locale]/(auth)/select-tenant/actions.ts,
    src/app/[locale]/(auth)/login/actions.ts,
    src/features/tenant/{domain,infrastructure}/**,
    src/shared/use-dialog-return-focus.ts,
    src/features/auth/presentation/email-verify/email-verify-dialog.tsx,
    node_modules/next/dist/client/components/redirect-error.d.ts,
    node_modules/next/navigation.d.ts
---

# State Architecture — US-E23.1 Tenant Switch Menu

## 0. Critical finding (verify-and-flag — read before the state machine)

**`switchTenantAction`'s current contract cannot reliably support FR-008/FR-009's
403-vs-5xx classification once wrapped in client-side `try/catch`, and this is a
data-contract gap, not a state-design detail — flagging to `fe-lead` for a
decision before Phase 4 implementation.**

Verified facts:
- `switchTenantAction` (`src/app/[locale]/(auth)/select-tenant/actions.ts`)
  calls `useCase.execute(tenantId)` which is `SwitchTenantUseCase.execute` →
  `return this.repo.switchTenant(tenantId)` → `TenantRepository.switchTenant`
  → raw `this.http.post(...)`. **None of these three layers catch or map
  errors.** There is no `toFailure()` mapper and no `TenantFailure` union
  anywhere in `src/features/tenant/**` (confirmed via glob — only
  `entities/`, `repositories/`, `use-cases/`, `dtos/`, `mappers/` exist, no
  `failures/`). A non-2xx response propagates as a raw thrown `ApiError`
  (`code`/`status`/`retryable`) all the way out of the `'use server'` action,
  uncaught.
- This is the **opposite** of the established repo convention for actions
  that need branchable error handling: `loginAction`/`socialSigninAction`
  (`src/app/[locale]/(auth)/login/actions.ts`) have their use-case return a
  `{ data, error }` result and the action returns `{ errorKey?:
  AuthFailure["type"] }` — a stable key, never a thrown `ApiError` crossing
  the Server Action boundary (per `.claude/rules/i18n.md` §Nơi dịch: "Server
  Action/use-case/repository/domain KHÔNG dịch. Trả về key ổn định"). The
  `AnnouncementRepository.toFailure(err)` pattern (`errorCodeOf`/`statusOf` →
  discriminated union) is the canonical shape for this.
- **Why this matters for FR-008/FR-009 specifically**: Next.js Server Actions
  redact thrown-error detail across the server→client boundary in production
  builds (only a generic message + `digest` reliably survive; custom
  subclass properties like `ApiError.status`/`.code` are not guaranteed to
  serialize through the action's RSC payload). A client `try/catch` around
  `switchTenantAction(...)` that inspects `err.status === 403` is reading a
  property that may not exist on the object the client actually receives in
  production, even though it works in local dev. This is silent — the code
  compiles, dev testing looks correct, and it degrades in prod exactly like
  the AC-9/401 gap this story already had to descope.

**Recommendation (needs `fe-lead` decision, ADR-adjacent per the harness
data-contract rule — this changes an existing shared Server Action's
signature)**: change `switchTenantAction`'s contract from
`Promise<void>` (throws on failure, redirects on success) to a discriminated
result the client can safely branch on without depending on error-object
property survival across the action boundary:

```ts
// Recommended shape (not this agent's to implement — fe-nextjs-engineer):
type SwitchTenantResult =
  | { ok: true }                       // redirect() already fired inside the action
  | { ok: false; errorKey: "forbidden" | "network" };

// Requires: add TenantFailure union + toFailure() in
// src/features/tenant/domain/failures/tenant.failure.ts +
// src/features/tenant/infrastructure/repositories/tenant.repository.ts,
// mirroring AnnouncementRepository.toFailure()'s errorCodeOf/statusOf pattern.
// switchTenantAction wraps useCase.execute() in try/catch, classifies via
// toFailure(err), returns { ok:false, errorKey } — NEVER catches/converts the
// redirect throw (isRedirectError guard, see §2) since redirect only fires on
// the success path, after setAuthCookies, which is unreachable from a caught
// application error.
```

This is a strict superset of what `select-tenant.tsx` (the existing caller)
needs — it has no try/catch today and can simply not read the return value,
so this is additive/non-breaking to that caller. The state machine below is
designed against this recommended contract (labeled "Path A"). §7 documents
the fallback ("Path B": keep today's throw-based contract, wrap client-side,
accept the same class of prod-only gap already accepted for AC-9/401) in case
`fe-lead` decides not to touch the shared action this story.

## 1. State Architecture Summary

- **No TanStack Query, no global store.** Confirmed by reading
  `src/app/[locale]/t/[tenant]/(app)/layout.tsx`: `<AppShell>` receives
  `{children}` and `ReactQueryProvider` wraps only `{children}`, i.e.
  `<AppShell><ReactQueryProvider>{children}</ReactQueryProvider></AppShell>` —
  `AppShell` itself (and everything it renders directly, including `Header`)
  sits **outside** the `QueryClientProvider` tree. `plan.md`'s Phase 0 "done
  when" claim is verified correct.
- **Server state → server-fetched props.** `memberships` (enriched
  `TenantCardViewModel[]`) and `currentTenantId` are computed once per
  request in the RSC layout via `makeListMyMembershipsUseCase().execute()`
  (fail-closed to `[]`) + the already-computed `tokenTenantId` — passed down
  as plain props through `AppShell` → `Header`. No client-side refetch, no
  cache key, no `staleTime` — this data is as fresh as the current
  navigation/request; a switch always causes a full route change (via
  `redirect()`) which re-runs the RSC layout and gets fresh props on the next
  render. This is correct and sufilcient for NFR-008 (no stale cross-tenant
  data) — see §8.
- **Local component state** (candidate for a `use-tenant-switch.ts` hook —
  see recommendation in §9): `dialogOpen: boolean`, `loadingTenantId: string
  | null`, `cardError: { tenantId: string; kind: "forbidden" | "network" } |
  null`. All `useState` in/near `Header`. No `useReducer` needed — 3
  independent-but-coordinated pieces of state with simple guard-based
  transitions, not complex enough to warrant a reducer (see §3 state
  machine — it's a flat set of guards, not a graph with many valid paths).
- **Mutation → Server Action, no optimistic update.** `switchTenantAction` is
  invoked directly; deliberately **no optimistic "current tenant" flip**
  (AC-11/FR-011/UC-006 forbid any client-only mutation of a "current
  tenant" representation before the server round-trip resolves). The ONLY
  legitimate "success" UI change is the per-card loading indicator and,
  through it, a full navigation — there is nothing to roll back because
  nothing is optimistically set.
- **Key decision this doc locks**: the redirect-vs-error-throw guard uses
  `isRedirectError` deep-imported from `next/dist/client/components/redirect-
  error` (no stable public re-export exists in installed Next 16.2.7 —
  verified: `next/navigation.d.ts` does not export it). See §2.

## 2. Verified: redirect-guard import path

Checked `node_modules/next/dist/client/components/redirect-error.d.ts`:

```ts
export declare const REDIRECT_ERROR_CODE = "NEXT_REDIRECT";
export type RedirectType = 'push' | 'replace';
export type RedirectError = Error & {
  digest: `${typeof REDIRECT_ERROR_CODE};${RedirectType};${string};${RedirectStatusCode};`;
};
export declare function isRedirectError(error: unknown): error is RedirectError;
```

- `next/navigation.d.ts` does **not** re-export `isRedirectError` (grepped,
  zero matches) — there is no stable/public entry point for this guard in
  the installed Next version (16.2.7). The deep import
  `next/dist/client/components/redirect-error` is the same path Next's own
  internal `redirect.js` imports from (`getURLFromRedirectError` /
  `getRedirectTypeFromError` in that same file call it), so it is the
  canonical implementation, just not re-exported publicly.
- Repo precedent check: grepped `src/` for `NEXT_REDIRECT`/`isRedirectError`
  — the existing tests (`login/actions.test.ts`,
  `invitations/accept/actions.test.ts`, two `layout.test.ts` files) all
  assert against `error.digest` as a **plain string check**
  (`expect.stringContaining("NEXT_REDIRECT")` or manual `.startsWith(...)`),
  never the `isRedirectError` helper — because in every existing case the
  redirect is either uncaught (RSC layout) or the sole thing that can throw
  (no try/catch to disambiguate from). **This story is the first consumer
  that needs to disambiguate a redirect throw from an application-error
  throw inside the same try/catch**, which is exactly why `isRedirectError`
  (handles `redirect()` AND `permanentRedirect()`, future-proof against
  digest-format changes) is preferable to hand-rolling a `digest.startsWith`
  check here, even though it's a deep import.
- **Recommendation**: import `isRedirectError` from
  `"next/dist/client/components/redirect-error"` in the Header's switch
  handler (or the extracted hook, §9). This is a implementation detail
  worth a one-line code comment citing this doc, not a full ADR (it's a
  framework-internal-but-canonical utility, not an auth/token/data-contract
  decision) — unlike §0's finding, which IS data-contract-level and does
  need `fe-lead` sign-off.

## 3. State Inventory

| State | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| `memberships` | Server state → props | RSC (`layout.tsx`) → `AppShell` → `Header` | `TenantCardViewModel[]` (see §6) | Fetched once per request via `ListMyMembershipsUseCase`; fail-closed `[]`. Not refetched client-side (no TanStack Query — Header is outside the provider). |
| `currentTenantId` | Server state → props | RSC (`layout.tsx`, reused `tokenTenantId`) | `string` | Decoded once from the access-token `tenantId` claim; reused, not re-decoded, per plan.md Phase 2. |
| `switchTenantAction` | Server Action ref (prop) | `layout.tsx` → `AppShell` → `Header` | `(tenantId: string, role: string) => Promise<SwitchTenantResult>` (Path A) or `Promise<void>` (Path B, throws) | Server-action-as-prop, same convention as `onRequestEmailVerification`. |
| `dialogOpen` | Local UI state | `Header` (or `use-tenant-switch.ts`) | `boolean` | Controls the sibling `Dialog`, decoupled from `DropdownMenu`'s own open state (Risk B). |
| `loadingTenantId` | Local UI state | `Header` (or hook) | `string \| null` | Which card (if any) is mid-switch; drives per-card `aria-busy`, guards double-activation (FR-005/OQ "double-click"), guards busy-blocked dismiss (FR-006). |
| `cardError` | Local UI state | `Header` (or hook) | `{ tenantId: string; kind: "forbidden" } \| null` | Per-card 403 inline error (FR-008). Only ever set for the card that was clicked; cleared on next activation attempt or dialog close. Network/5xx (FR-009) does NOT set this — it's toast-only + reset to idle, per spec's explicit "distinct handling". |
| Toast (network/5xx, FR-009; 401 folded in per fe-lead's AC-9 descope) | Ephemeral, not state | `sonner` (already a dependency) | n/a — fire-and-forget | Not stored in React state; a side effect of the error branch. |
| Success toast (FR-004) | Ephemeral, not state | `sonner` | n/a | Fired just before/alongside the `redirect()` throw propagates — see §5 ordering note. |
| `dialogOpen`'s invoker ref (focus restore) | Local UI state (ref, not reactive) | `Header`/hook via `useDialogReturnFocus(dialogOpen)` | `useRef<HTMLElement \| null>` | REUSE the existing `src/shared/use-dialog-return-focus.ts` hook verified this session — it is the exact "prior story's fix pattern" plan.md's Risk B told the engineer to search for. Do not reimplement (`email-verify-dialog.tsx` has an inline pre-extraction version of the same logic — the extracted hook is the canonical one now). |

## 4. State Flow

```
RSC layout.tsx
  ├─ tokenTenantId = decodeTenantId(token)          (existing, reused as currentTenantId)
  ├─ memberships = await listMyMemberships().catch(() => [])
  ├─ enriched = memberships.map(m => ({ ...m, ...resolveTenantDisplay(m.tenantId),
  │                                     isCurrent: m.tenantId === tokenTenantId,
  │                                     isSwitchable: isSwitchable(m) }))
  └─ <AppShell memberships={enriched} currentTenantId={tokenTenantId}
               onSwitchTenant={switchTenantAction}>
        └─ <Header memberships currentTenantId onSwitchTenant>
             ├─ user-menu block: reads currentTenantId → finds match in
             │    memberships → TenantLogo + role badge (FR-007); no match
             │    (stale/foreign id, or empty array from fetch-fail) →
             │    role-only fallback (AC-001.2/3) — pure render-time derivation,
             │    NOT separate state.
             ├─ "Đổi trường" DropdownMenuItem — rendered iff
             │    memberships.filter(isSwitchable).length >= 2 (FR-001/002,
             │    derived at render, not stored)
             │    onSelect → setDialogOpen(true)
             └─ <Dialog open={dialogOpen} onOpenChange={guardedOnOpenChange}>
                  └─ N × <TenantCard onActivate={handleActivate}>
                       handleActivate(tenantId, roles):
                         if tenantId === currentTenantId → return (FR-005 no-op)
                         if loadingTenantId !== null → return (guard, no double-fire)
                         setCardError(null); setLoadingTenantId(tenantId)
                         try {
                           const result = await onSwitchTenant(tenantId, roles[0] ?? "")
                           // Path A: result is { ok:false, errorKey } on failure —
                           //   never throws for application errors; only throws
                           //   for the redirect (which IS the success path).
                           if (!result.ok) {
                             if (result.errorKey === "forbidden") {
                               setCardError({ tenantId, kind: "forbidden" })  // FR-008
                             } else {
                               toast.error(t("tenant.switch.errorGeneric"))   // FR-009
                             }
                             setLoadingTenantId(null)
                           }
                           // result.ok === true: unreachable in practice — the
                           // action's redirect() fires before returning, see §5.
                         } catch (err) {
                           if (isRedirectError(err)) throw err   // let it propagate — Risk A
                           // Path B fallback only: classify err.status here instead
                           toast.error(t("tenant.switch.errorGeneric"))
                           setLoadingTenantId(null)
                         }
```

On the redirect propagating, React unmounts the current route tree (new RSC
render for the target tenant) — `dialogOpen`/`loadingTenantId`/`cardError`
are torn down as part of that unmount, not explicitly reset. No SSE
invalidation applies to this story (no realtime surface here).

## 5. Ordering note — success has no client-visible "success" state before navigation

`switchTenantAction` calls `setAuthCookies(tokens)` then unconditionally
`redirect(...)`. `redirect()` throws synchronously (as part of the action's
execution) — the action's promise, from the client's point of view, **never
resolves with `{ ok: true }`**; it always either (a) throws the redirect (the
common/success case) or (b) throws/returns the application-error branch.
This means:
- The success toast (AC-004.4, "Đã chuyển sang {school}") **cannot** be
  fired from the client after `await onSwitchTenant(...)` resolves — that
  line is never reached on success. It must be fired either (i) as a
  fire-and-forget `toast.success(...)` issued right before the `await` call
  resolves is impossible to sequence correctly since we don't know success
  ahead of time — so recommend: (ii) toast fired from the **destination**
  route/layout (e.g. a one-shot query-param or a cookie flag read once by
  the target tenant's landing page) OR (iii) simplest — fire the toast
  client-side in a `.then()`-adjacent microtask is moot since the throw
  happens synchronously within the awaited call, so **the practical
  approach is: skip a client-fired success toast entirely and treat the
  visible page transition itself as the success signal**, OR pass a toast
  key via the redirect target URL's search param that the destination page
  reads once (e.g. `?switched=1`) and fires client-side on mount, clearing
  the param via `router.replace` to avoid re-firing on refresh.
- **Flag to `fe-component-architect`/`fe-nextjs-engineer`**: this is a
  cross-cutting UX detail (how AC-004.4's success toast physically fires
  given `redirect()`'s throw-before-return semantics), not purely a state
  question, but it changes what state (if any) needs to survive the
  navigation. Recommend the `?switched=1`-param approach since it needs no
  new server state and matches the "no client-only mutation before the
  round-trip resolves" spirit of AC-11 (the toast fires only once the NEW
  route has actually rendered, i.e. after the switch is provably durable).

## 6. ViewModel shape (for `fe-component-architect` alignment — not authoritative on component props, just the data shape this doc assumes)

```ts
interface TenantCardViewModel {
  tenantId: string;
  roles: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LEFT";
  tenantName: string;
  address: string;
  logoColor: string;
  isCurrent: boolean;      // tenantId === currentTenantId
  isSwitchable: boolean;   // status === "ACTIVE" (reuses isSwitchable())
}
```

Loading/error are NOT baked into this type — they're `Header`'s local state
(`loadingTenantId`/`cardError`), derived-and-passed as per-card booleans/
strings at render time (`isLoading={loadingTenantId === m.tenantId}`), so the
server-shaped VM stays a pure data object and doesn't get polluted with
transient UI state (keeps it reusable as-is by US-E23.2's full-page grid,
which has its own local loading/error state, per the shared-component note in
plan.md).

## 7. Async State Machine

| State | Trigger | UI treatment |
| --- | --- | --- |
| **Menu item: absent** | `memberships.filter(isSwitchable).length < 2` (incl. the `[]` fail-closed case) | No DOM node at all — zero-noise (FR-002). Not a disabled/greyed item. |
| **Menu item: shown** | `>= 2` switchable | `DropdownMenuItem role=menuitem`, `switchHorizontal` icon (FR-001). |
| **Header block: matched** | `currentTenantId` found in `memberships` | `TenantLogo` + role badge (FR-007). |
| **Header block: fallback** | no match (stale/foreign id) OR `memberships === []` (fetch-fail) | role-only display, never crash (AC-001.2/3). |
| **Dialog: closed** | initial / after close | not mounted (Radix unmounts content by default). |
| **Dialog: open, populated** | `dialogOpen === true`, `memberships.length > 0` | focus-trapped, N `TenantCard`s, current card has "Hiện tại" badge. |
| **Dialog: open, empty** (should-not-happen) | `dialogOpen === true`, `memberships.length === 0` — only reachable defensively/in Storybook since the menu item itself requires ≥2 | `tenant.select.empty` copy (recommend a **new** `tenant.switch.empty` key per plan.md Phase 5's own recommendation — do not cross-import `tenant.select.*`, avoids two features co-owning one i18n key). |
| **Card: idle** | default / after error / after success-elsewhere | plain button, clickable. |
| **Card: current (no-op target)** | `tenantId === currentTenantId` | rendered with "Hiện tại" badge; `handleActivate` returns immediately, no state change, no network call (FR-005/AC-004.5). |
| **Card: loading** | `loadingTenantId === tenantId` | `aria-busy="true"`, `role="status"`, sr-only "Đang chuyển…", shown within 100ms (NFR-005); OTHER cards remain idle/clickable-guarded (guard clause blocks re-entrancy but doesn't visually disable siblings — confirm with `fe-component-architect` whether siblings should be visually disabled too; not specified in AC, recommend leaving them interactive-but-guarded to match FR-005/006's precision, i.e. only the acting card gets the busy treatment). |
| **Card: 403 error** | `cardError?.tenantId === tenantId` | inline error text on that card (mapped from `errorKey: "forbidden"` → i18n `tenant.switch.error403`); dialog stays open; `loadingTenantId` already reset to `null` before this renders (FR-008). |
| **Generic/network/5xx/401 error** | any non-403 failure (incl. the descoped 401 case) | toast only (`tenant.switch.errorGeneric`), card returns to idle, dialog stays open (FR-009, and AC-9 per fe-lead's descope). |
| **Dismiss: blocked** | Escape/backdrop while `loadingTenantId !== null` | `onOpenChange` guard returns without calling `setDialogOpen(false)` (FR-006). |
| **Dismiss: allowed** | Escape/backdrop while `loadingTenantId === null` | `setDialogOpen(false)`; `useDialogReturnFocus`'s `onCloseAutoFocus` returns focus to the dropdown trigger (FR-006/UC-005/AC-005.1). |
| **Success (transient)** | redirect throw propagates | not really a rendered "state" — the component tree unmounts as the new route renders; see §5 for the success-toast sequencing caveat. |

Error → failure-key → i18n mapping (Path A):

| `errorKey` (stable, from `toFailure()`) | i18n key | Surface |
| --- | --- | --- |
| `"forbidden"` | `tenant.switch.error403` | inline on the clicked `TenantCard` |
| `"network"` (covers network/5xx/timeout, and 401 per the AC-9 descope) | `tenant.switch.errorGeneric` | toast |

## 8. Race Conditions & Resolution

- **Double-activation on the same card** (rapid double-click/double-Enter
  while its own call is pending): guarded by the `loadingTenantId !== null`
  early-return in `handleActivate` — the OPEN QUESTION in spec.md §8 is
  resolved here as: yes, implicitly disabled via the existing
  `loadingTenantId` guard, no separate per-card `disabled` prop needed
  beyond what the guard already provides. Confirms `plan.md`'s own
  recommendation.
- **Activating a different card while one is already loading**: same guard
  (`loadingTenantId !== null` blocks ANY new activation, not just the same
  card) — the dialog only ever has one in-flight switch at a time, matching
  FR-006's single-loading-card assumption (`aria-busy`/dismiss-guard are
  keyed off a single `loadingTenantId`, not a set).
- **Dismiss attempted mid-flight**: resolved by FR-006's guard directly (not
  a race so much as an ordering rule) — `onOpenChange` is a pure function of
  current `loadingTenantId`, no separate flag needed.
- **Revoke-mid-flight (target membership goes SUSPENDED between dialog-open
  and card-click)**: this is exactly what FR-008's 403 branch covers — BE is
  the sole source of truth (AC-006.4, "BE rejection cannot be bypassed by
  stale client state"); the stale `memberships` prop is never trusted for
  the actual switch decision, only for rendering the button — enforcement is
  server-side, by construction, since the UI never optimistically mutates
  anything.
- **Post-switch stale cross-tenant data (NFR-008)**: resolved structurally,
  not by an invalidation call — because there is no client cache to
  invalidate (no TanStack Query at this boundary) and the switch always
  completes via `redirect()` into a fresh RSC render of the target tenant's
  `layout.tsx`/`page.tsx` tree (new `params.tenant`, new `getAccessToken()`
  read reflecting the just-rotated cookies) — the OLD tree is fully
  unmounted, not patched in place. If a `ReactQueryProvider`-scoped query
  cache exists further down the tree (inside `{children}`), it is
  remounted fresh too (new `QueryClientProvider` instance per navigation,
  since `AppShell`/`ReactQueryProvider` re-render from the RSC root) — no
  explicit `queryClient.clear()` call is needed for this story; flag to
  `fe-tech-lead-reviewer` to confirm the `ReactQueryProvider` component does
  create a fresh `QueryClient` per mount rather than a module-level
  singleton, since that assumption is what makes this "structural, not
  invalidation-based" claim hold — **not verified by this agent this
  session, worth a quick grep before Phase 6 closes.**
- **Two tabs, switch in one** (spec.md's OPEN QUESTION): confirmed out of
  scope per spec.md — no state design needed; noting for completeness only.

## 9. Hook extraction recommendation

**Recommend extracting `use-tenant-switch.ts`**, colocated with `Header`
(`src/components/layout/app-shell/header/use-tenant-switch.ts`), owning
`dialogOpen`, `loadingTenantId`, `cardError`, and the `handleActivate`/
`guardedOnOpenChange` functions, returning them plus a `dialogTriggerRef`
wiring for `useDialogReturnFocus`. Reasons:
- The redirect-vs-error classification logic (Risk A) is the single highest-
  risk piece of behavior in this story and benefits from being unit-testable
  in isolation (inject a fake `onSwitchTenant` that throws a
  redirect-shaped object vs an `ApiError`-shaped result, assert the guard
  correctly rethrows one and classifies the other) without mounting the
  full `Header` (which also pulls in `RoleSwitcher`, theme toggle, SSE
  banner wiring, etc. — see the current `header.tsx` read this session).
  This directly matches Phase 4's own test-first list (5 cases including
  the redirect-passthrough proof) — a hook makes those 5 cases a pure-logic
  unit/interaction test instead of a full-component interaction test.
- Matches this repo's existing extraction precedent:
  `use-dialog-return-focus.ts` (`src/shared/`) and `use-sidebar-collapsed.ts`
  (`sidebar/`) are both small, single-purpose hooks extracted out of
  otherwise-JSX-heavy components for the same testability reason.
- Keeps `Header` itself focused on rendering/composition, consistent with
  `component-organization.md`'s spirit even though that rule is about
  component placement, not hooks — same underlying principle (single
  responsibility, no logic hidden inside a large JSX component).

Do NOT extract a `TanStack Query`-flavored hook name (e.g. no
`useTenantSwitchMutation`) — this is plain async local-state orchestration
around a Server Action, not a query-cache concern; naming it `use-tenant-
switch.ts` (not `-query.ts`/`-mutation.ts`) keeps that distinction visible to
future readers, matching this repo's decision to have NO TanStack Query at
this boundary.

## 10. Summary of what this doc finalizes vs. what still needs a decision

- **Finalized** (verified, not just trusted from plan.md): §1 (no
  TanStack Query, Header outside `ReactQueryProvider`), §2 (redirect-guard
  import path), §3/§4 (full state inventory + flow), §7 (async state
  machine + error→i18n mapping), §8 (race conditions), §9 (hook
  extraction — recommended, not mandatory).
- **Needs `fe-lead` decision before Phase 4** (§0, the one genuinely new
  finding from this pass): whether `switchTenantAction`'s contract changes
  to a discriminated result (Path A, recommended) or stays throw-based
  (Path B, accepts the same class of prod-only gap as the already-descoped
  AC-9/401 case). This is a data-contract change to an existing shared
  Server Action (`select-tenant.tsx` also calls it) — flagging per the
  harness rule to route auth/data-contract decisions through `fe-lead` for
  an ADR-adjacent call, not deciding it unilaterally here.
- **Needs `fe-component-architect` alignment**: §5's success-toast
  sequencing (the `?switched=1`-param recommendation) touches which
  component reads/clears that param — a component-tree question, not purely
  state, flagging for their parallel pass to reconcile.
