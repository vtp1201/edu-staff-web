---
title: FE Engineering Plan — US-E23.2 Post-Login Select-Tenant Screen
status: planned
lane: high-risk
inputs:
  - spec.md (consolidated BA deliverable — FR-001..011, NFR-001..006, UC-001..005, AC-001..005.8)
  - use-cases.md, requirements.md, integration.md, story.md
  - design_src/edu/tenant-switch.jsx — TenantSelectScreen (visual reference only, decision 0011)
  - docs/product/design-spec.jsonc → screens.selectTenant (read this session)
  - Existing code read this session: src/app/[locale]/(auth)/select-tenant/{page.tsx,select-tenant.tsx,actions.ts}
    src/features/tenant/domain/entities/tenant-membership.entity.ts
    src/features/tenant/infrastructure/{enrich-memberships.ts,mocks/tenant-display.mock.ts}
    src/components/shared/tenant-card/{tenant-card.tsx,tenant-logo.tsx,tenant-switch-dialog.tsx,switch-activation.ts,tenant-card.i-vm.ts}
    src/bootstrap/di/{tenant.di.ts,auth.di.ts}, src/app/[locale]/(auth)/login/actions.ts (logoutAction)
  - US-E23.1's plan.md (sibling packet) for prior fe-planner conventions on this same shared component set
---

# Plan — US-E23.2 Post-Login Select-Tenant Screen

## 0. Correction carried from fe-lead brief (do not let engineer skip this)

`spec.md` frames FR-006 (zero-noise skip) and the routing-branch logic as
"existing behavior, unchanged." **That is true only for the routing GATE
decision** (whether the caller lands on `(auth)/select-tenant` at all — owned
by `US-001-tenant-path-resolver`, unchanged). It is **false for the screen's
own branching**: today `page.tsx` unconditionally calls
`makeListMyMembershipsUseCase().execute()` with no try/catch and renders
`<SelectTenant memberships={memberships} .../>` regardless of count — no
skip-if-1, no distinct empty state, no error state. **FR-006/007/008 are new
logic this story adds inside the route folder**, not defensive polish. Phases
2–3 below build all three branches from scratch.

## 1. Headline decisions (read first — shape every phase)

### Decision A — Skeleton via `loading.tsx`, not a client timer
NFR-003 wants "skeleton if fetch exceeds 300ms, not a blank screen." `page.tsx`
stays a fully-`await`ing RSC (matches the existing pattern — no client-side
300ms setTimeout gating). Add a sibling `loading.tsx` (Next's route-level
Suspense boundary) with the design's skeleton markup — Next automatically
wraps `page.tsx` in `<Suspense fallback={<Loading/>}>` for the initial
navigation. This shows the skeleton immediately while first-load data
resolves (a superset of ">300ms", never a blank screen) with **zero extra
client code**. Do not build a custom debounced-skeleton client wrapper —
YAGNI, `loading.tsx` is the idiomatic Next primitive for exactly this.

### Decision B — Retry (FR-008) via `router.refresh()`, not a new Server Action
RSC pages cannot natively "retry" — once `page.tsx` has returned, there is no
live component to re-invoke. Two options were considered:
1. A new `retryMembershipsAction` (`'use server'`) that re-runs the two
   use-cases and returns a discriminated result to client state.
2. A client "Thử lại" button that calls `next/navigation`'s
   `useRouter().refresh()` inside `startTransition` — this makes Next
   **re-execute `page.tsx` on the server** with the exact same try/catch this
   plan already needs for the first load, and re-renders the client subtree
   with fresh props.

**Chosen: (2).** It reuses `page.tsx`'s existing try/catch (single source of
truth for the fetch-and-branch logic, no duplicated DI wiring in a second
action), needs no new file, and matches "RSC-first" (state-engineer would
otherwise be pulled in for (1)'s client-state reconciliation — not needed
here). `useTransition`'s `isPending` drives the retry button's own loading
affordance (AC-004's "no blank spinner" concern) independent of whether
`loading.tsx`'s fallback also flashes during the refresh (Next does show
`loading.tsx` again during `router.refresh()` — acceptable, it's the same
skeleton, not a regression; verify empirically in Phase 2 and note in the
packet if behavior differs from this assumption).

**This is a pattern decision, not an ADR-worthy one** — no token, no auth
flow, no cross-feature contract changes; it only decides which existing Next
primitive absorbs a retry. Flag to fe-lead as decided-here; register only if
fe-lead disagrees.

### Decision C — No shared-component or domain forking
Everything needed (`TenantCard`, `TenantLogo`, `runSwitchActivation`,
`TenantCardViewModel`, `enrichMemberships`, `resolveTenantDisplay`,
`switchTenantAction`) already exists from US-E23.1 and is **reused verbatim**.
This story adds exactly one small pure domain helper (Phase 1) and one
route-local container rewrite (Phase 3) — no new `components/shared/`
member, no new DI factory, no new endpoint.

### Decision D — Empty-state escape action reuses `logoutAction`
`src/app/[locale]/(auth)/login/actions.ts` already exports `logoutAction()`
(`'use server'`, calls `makeLogoutUseCase()`). Import it directly into the
new empty-state client component — this is the first cross-route reuse of
that action, which is fine (it's a plain exported async function, no
route-coupling in its implementation). Do not duplicate a second logout
action under `select-tenant/`.

### Decision E — Retire `tenant.select.*`, add `tenant.switch.postLogin.*`
Grep confirmed `tenant.select.*` is referenced ONLY by the two files this
story rewrites (`page.tsx`, `select-tenant.tsx`). Per NFR-004, add the new
namespace and delete the old keys in the same commit (no dangling dead keys).

## 2. Phase breakdown

### Phase 1 — Domain: routing-branch predicate (TDD, pure, red first)

Files:
- `src/features/tenant/domain/entities/tenant-membership.entity.ts` (extend) —
  add
  ```ts
  export type MembershipCountBranch = "multiple" | "single" | "none";
  export function classifyMembershipCount(
    memberships: TenantMembership[],
  ): MembershipCountBranch {
    const active = memberships.filter(isSwitchable);
    if (active.length >= 2) return "multiple";
    if (active.length === 1) return "single";
    return "none";
  }
  ```
  (reuses `isSwitchable()` unchanged — AC-003.3's "all-INACTIVE counts as
  empty" falls out for free since `isSwitchable` already filters to ACTIVE).
- `src/features/tenant/domain/entities/tenant-membership.entity.test.ts` (new)
  — **write first**: 0 memberships → `"none"`; 1 ACTIVE → `"single"`; 2 ACTIVE
  → `"multiple"`; N ACTIVE + M INACTIVE/SUSPENDED/LEFT where active count is
  0/1/≥2 → same three branches (AC-003.3 proof); order-independence.

Done when: `classifyMembershipCount` unit tests green; this is the ONLY
domain-layer change in the story — if the engineer touches anything else in
`features/tenant/domain/`, that's a signal to re-check Phase 0/Decision C.

### Phase 2 — `page.tsx` rewrite: RSC data load, try/catch, four-way branch

Files:
- `src/app/[locale]/(auth)/select-tenant/loading.tsx` (new) — skeleton per
  `design_src/edu/tenant-switch.jsx` (heading-shaped bar + N placeholder card
  rows), tokens-only, `aria-hidden` decorative shimmer (motion-safe gated per
  `.claude/rules/accessibility.md`).
- `src/app/[locale]/(auth)/select-tenant/page.tsx` (rewrite):
  1. `try { memberships = await (await makeListMyMembershipsUseCase()).execute() } catch { return <SelectTenant screenState={{ kind: "error" }} onSwitchTenant={switchTenantAction} /> }`
     — this is the ONLY hard failure path (FR-008). A 401 here is already
     handled upstream by the existing guard/refresh flow (AC-004.4) — this
     catch only fires for network/5xx/timeout on `GET /members/me/tenants`
     itself, never for token invalidity (confirm by checking what
     `ListMyMembershipsUseCase`/`TenantRepository` actually throw for 401 vs
     other statuses — if 401 surfaces as the same generic failure type here,
     flag to fe-lead; do not special-case it inside this catch without that
     confirmation).
  2. `const branch = classifyMembershipCount(memberships)`.
  3. `branch === "single"` → **RESOLVED by fe-lead (verified against code, 2026-07-19 — do not re-litigate)**: this must call `switchTenantAction(sole.tenantId, sole.roles[0] ?? "")` (the exact FR-004 action, reused unchanged), NOT a bare `redirect()`. Verified: `src/bootstrap/tenant/access-guard.ts::evaluateTenantAccess` requires the active token's `tenantId` claim to equal the URL's tenant segment, returning `"no-active-tenant"` otherwise; and `login/actions.ts`'s own comment confirms signin issues a NON-tenant-scoped token — the caller does NOT yet hold a token scoped to the sole tenant when they land on `select-tenant`. `US-001-tenant-path-resolver`'s `design.md` contains no auto-mint-on-sole-tenant step (grepped: no mention of "select-tenant"/"sole"/auto-mint at all — it only covers the URL→tenantId resolution + the guard verdict, not this login-time decision). So a bare `redirect({ href: tenantUrl(...) })` would land the caller on the guard's `"no-active-tenant"` verdict and bounce them right back. Implementation: `try { await switchTenantAction(sole.tenantId, sole.roles[0] ?? "") } catch (err) { if (isRedirectError(err)) throw err; /* fall through to error state, do not crash */ }` — `switchTenantAction` itself throws `NEXT_REDIRECT` on success (propagate unchanged, same Risk-A pattern as `runSwitchActivation`) and returns `{ ok:false, errorKey }` on failure (map to the same FR-008 error state — a switch failure for the caller's own sole ACTIVE membership is an edge case, e.g. a race where it flips SUSPENDED between the list-call and now; treat as this screen's generic error, do not build a special third error copy for it). This makes Phase 2 heavier than originally scoped (it directly reuses the mint/redirect action from the routing branch, not just the click handler) — the engineer must wire `switchTenantAction` into `page.tsx` (RSC) for this one branch, which is fine since it's still just an async function call inside a Server Component, not a client boundary.
  4. `branch === "none"` → render `<SelectTenant screenState={{ kind: "empty" }} onSwitchTenant={switchTenantAction} />` (FR-007).
  5. `branch === "multiple"` → soft-fetch profile name: `const profile = await (await makeGetProfileUseCase()).execute().catch(() => null)` (failure here is NOT the hard error path — FR-002/AC-001.2 says fall back to a name-less subheading, never blank/"undefined") → `const cards = enrichMemberships(memberships, null)` (reuse unchanged, `currentTenantId: null` per US-E23.1's doc comment already anticipating this exact call) → render `<SelectTenant screenState={{ kind: "cards", userName: profile?.name ?? null, count: cards.length, cards }} onSwitchTenant={switchTenantAction} />`.

Test first: none new at this file's own layer beyond Phase 1's unit test —
the branch wiring is proven at the Storybook/interaction level (Phase 4) since
`page.tsx` is an RSC composition root, not an isolated unit target (matches
Phase 2's precedent in US-E23.1's plan.md).

Done when: `bunx tsc --noEmit` clean; manual smoke of all 4 branches in mock
mode (`NEXT_PUBLIC_USE_MOCK=true`) before Phase 4 stories are written.

### Phase 3 — `select-tenant.tsx` rewrite: full-page container (client)

Files:
- `src/app/[locale]/(auth)/select-tenant/select-tenant.i-vm.ts` (new) — the
  screen-state contract shared between `page.tsx` and this component:
  ```ts
  export type SelectTenantScreenState =
    | { kind: "error" }
    | { kind: "empty" }
    | { kind: "cards"; userName: string | null; count: number; cards: TenantCardViewModel[] };
  ```
- `src/app/[locale]/(auth)/select-tenant/select-tenant.tsx` (rewrite,
  `"use client"`):
  - Props: `{ screenState: SelectTenantScreenState; onSwitchTenant: typeof switchTenantAction }`.
  - `kind: "error"` → error message + "Thử lại" button → `onClick` = `startTransition(() => router.refresh())` (Decision B), `isPending` drives button's own spinner/disabled state.
  - `kind: "empty"` → "Bạn chưa thuộc tổ chức nào" + a real `<button>`/`<form action={logoutAction}>` wired to `logoutAction` (Decision D) — keyboard-operable by construction (native button/form).
  - `kind: "cards"` → heading + subheading (interpolate `userName`/`count`; name-less variant when `userName` is `null` — AC-001.2) + footnote (conditional — see Phase 5 i18n note) + card grid:
    - Reuse the exact per-card state machine `TenantSwitchDialog` already has
      (single `loadingTenantId`/`errorTenantId` local state, `runSwitchActivation`
      from `@/components/shared/tenant-card`, `TenantCard` per card) — copy the
      shape, not the JSX (this container is a full-page grid `<div>`, not a
      `<Dialog>`); do NOT introduce a second copy of the activation logic —
      `runSwitchActivation` is already framework-free and dialog-agnostic.
    - No `isCurrent` badge ever renders here because `enrichMemberships` was
      called with `currentTenantId: null` — every card's `isCurrent` is
      `false` by construction (matches design-spec `"isCurrent always false
      here"), nothing extra to suppress in this component.
  - Grid layout: `gap: 12` per `design-spec.jsonc`, single column below
    ~440px column width per NFR-002 (CSS grid `grid-cols-1 sm:grid-cols-2` or
    equivalent — confirm against the jsx reference's actual breakpoint, not
    invented).

Test first: none new beyond Phase 4's Storybook interaction proofs (this is
presentation composition over an already-tested activation controller —
`runSwitchActivation`'s redirect-passthrough/403/network branches are already
unit-tested from US-E23.1 and reused unchanged here; re-testing that logic in
isolation again would be redundant. The NEW behavior to prove here is the
screen-state branching + retry + empty-state escape, which is exactly what
Phase 4's stories cover).

Done when: all three `screenState` variants render correctly against static
fixtures (pre-Storybook manual check), matches `design-spec.jsonc`
`screens.selectTenant` values (heading 22px/800, card grid gap 12, maxWidth
480 centered column).

### Phase 4 — i18n

New namespace `tenant.switch.postLogin.*` in `messages/{vi,en}.json` (vi
source + en mirror, edited together):
- `heading` — "Chọn trường để tiếp tục"
- `subheadingWithName` — "Xin chào {name} — tài khoản của bạn thuộc {count} trường." (use ICU plural if the count phrasing needs it — confirm Vietnamese doesn't pluralize; likely a straight `{count}` interpolation is enough, EN mirror may want `{count, plural, one {...} other {...}}` — decide at implementation time, keep VI as source)
- `subheadingNoName` — "Tài khoản của bạn thuộc {count} trường." (AC-001.2 fallback, no name)
- `footnote` — "Bạn có thể đổi trường bất kỳ lúc nào từ menu tài khoản." (conditional render — see Constraints below)
- `emptyTitle` — "Bạn chưa thuộc tổ chức nào" (same string as old `tenant.select.empty`, new key)
- `errorTitle` / `errorRetry` — FR-008 copy + "Thử lại" button label
- Skeleton (`loading.tsx`) needs no translated text if purely decorative shimmer bars (no literal copy) — confirm during implementation; if any sr-only "Đang tải…" text is added, key it here too.

Reused, NOT reintroduced: `tenant.switch.current` (no — never used on this
screen, skip that key entirely, but do reuse `tenant.switch.cardAriaLabel`,
`.switching`, `.error403`, `.errorGeneric` — `TenantCard`/`runSwitchActivation`
already call `useTranslations("tenant.switch")` internally, this screen's own
copy lives one level deeper at `tenant.switch.postLogin.*` so both coexist
without collision). Empty-state logout button label reuses existing
`shell.header.logout` via a second `useTranslations("shell.header")` call —
do not add a duplicate "logout" key under the new namespace (DRY).

Delete (Decision E): `tenant.select.*` (5 keys: `empty`, `enter`, `roles`,
`subtitle`, `switching`, `title`) from both `vi.json`/`en.json` once the
rewrite lands — confirmed dead by this session's grep (only the two rewritten
files reference it).

Done when: `bunx tsc --noEmit` passes (typed messages catch stale/renamed
keys — this is exactly the case where the type-check earns its keep, since
`tenant.select.*`'s removal will surface any missed call site immediately);
grep for hardcoded Vietnamese diacritics in the two rewritten `.tsx` files
returns clean.

### Phase 5 — Storybook interaction stories (E2E proof, TDD for the container)

File: `src/app/[locale]/(auth)/select-tenant/select-tenant.stories.tsx` (new).
Write these BEFORE finalizing Phase 3's implementation details (interaction
tests double as the executable spec for the container, per `.claude/rules/tdd.md`'s
E2E/Story tier). Map 1:1 to `story.md`'s 12 named stories:

| # | Story name | `screenState` fixture | Assertion |
| - | --- | --- | --- |
| 1 | `ScreenShown_CardGrid` | `cards`, userName set, 3 memberships | heading+subheading text, 3 real `<button>` cards, no "Hiện tại" anywhere |
| 2 | `NameUnavailableFallback` | `cards`, `userName: null` | name-less subheading variant, no literal "undefined"/blank |
| 3 | `Loading_Skeleton` | N/A — this is `loading.tsx` itself | render `loading.tsx` in isolation, assert skeleton markup + `aria-hidden` |
| 4 | `Skip_SingleTenant` (negative) | N/A — page-level, not this component | covered at a different layer — see note below, not a `select-tenant.tsx` story |
| 5 | `Empty_ZeroActive` | `empty` | empty message + keyboard-focusable logout control present |
| 6 | `Error_FetchFail` | `error` | error message + retry button, no card grid rendered |
| 7 | `Error_RetrySuccess` | play function: start `error`, mock `router.refresh` to resolve, simulate re-render with `cards` state | retry button interaction fires; (component-level, the actual server refetch is out of this story's reach — assert the button calls the router hook, not the full round-trip) |
| 8 | `Error_RetryFailAgain` | stays `error` after retry click | no auto-redirect loop, error state persists |
| 9 | `SelectSuccess` | `cards`, mock `onSwitchTenant` resolving `{ ok: true }` (redirect never actually fires in a story sandbox) | per-card loading shown within the interaction, no crash on the "unreachable in practice" success branch |
| 10 | `Select403` | mock `onSwitchTenant` resolving `{ ok:false, errorKey:"forbidden" }` | inline card error rendered, caller stays on screen (no navigation attempted in test sandbox by construction) |
| 11 | `SelectNetworkError` | mock resolving `{ ok:false, errorKey:"network" }` | toast fires, card returns to idle |
| 12 | `Select401Retry` | same as `SelectNetworkError` fixture (401 folds into the generic network path per FR-011/current `toErrorKey` mapping — confirm this still matches `actions.ts`, unchanged) | same assertion as #11, documented as "401 today == network path" so the story is honest about current behavior |

Note on #4 (`Skip_SingleTenant`): this is a **routing/`page.tsx`-level**
behavior (the component is never rendered at all), not something
`select-tenant.tsx`'s own Storybook can assert. Cover it as an **integration
test** instead: a `page.test.tsx`-equivalent (or a focused test against
`classifyMembershipCount` + a thin assertion that `page.tsx`'s single-branch
calls `redirect(...)` and never calls `enrichMemberships`/renders
`<SelectTenant>` — e.g. mock `makeListMyMembershipsUseCase` to return exactly
1 ACTIVE membership and assert the redirect target, matching the pattern
`actions.test.ts` already uses for `switchTenantAction`). Do not force this
into a component story just to hit "12 Storybook stories" — story.md's list
mixes route-level and component-level proofs under one E2E row; the
Storybook file covers 11, the 12th is an integration test alongside Phase 6's
matrix.

Done when: all 11 component stories pass Storybook interaction runner; the
12th (`Skip_SingleTenant`) integration test passes; design-review gate
checklist run locally (contrast, focus-visible on cards/retry/logout button,
motion-safe on skeleton shimmer, 320px viewport no overflow).

### Phase 6 — Test-matrix mapping (proof rows, align to story.md's Validation table)

| Layer | Target | Proof |
| --- | --- | --- |
| Unit | `classifyMembershipCount()` | 0/1/≥2 branches incl. mixed-status counting (Phase 1) |
| Unit | `logoutAction`/`switchTenantAction` reuse | none new — already proven by US-E23.1's `actions.test.ts` (5 cases); do not re-derive |
| Integration | `page.tsx` single-branch redirect (AC-002.1/002.2) | new focused test mocking `makeListMyMembershipsUseCase` → 1 ACTIVE membership → assert `redirect()` called with `tenantUrl(...)`, assert `<SelectTenant>`/card markup never reached |
| Integration | `page.tsx` fetch-fail branch (AC-004.1) | mock `makeListMyMembershipsUseCase` rejecting → assert `screenState.kind === "error"` prop reaches the component, no throw escapes to Next's generic error boundary |
| Integration | profile-fetch soft-failure (AC-001.2) | mock `makeGetProfileUseCase` rejecting while memberships resolve → assert `userName: null` reaches the component (not a hard error) |
| E2E/Storybook | 11 stories (Phase 5 table) | interaction runner |
| E2E/Storybook | `loading.tsx` skeleton | isolated story, states: default |
| Platform | `bun build` + `bunx tsc --noEmit` | both green; the `tenant.select.*` key deletion is exactly the case tsc should catch if a call site was missed |
| Release | design-review gate, a11y audit (identical `TenantCard` contract as US-E23.1 — no new a11y surface besides retry button + logout button + skeleton), confirm no regression to `US-001-tenant-path-resolver`'s own guard tests (run its existing suite, do not edit its files) |

Add a `docs/TEST_MATRIX.md` row for US-E23.2 at `planned` before any code (per
`.claude/rules/tdd.md`), flip to `implemented` once the above proofs exist —
follow US-E23.1's row as the format template (one dense paragraph naming every
proof file + count).

## 3. Component + state sketch (light — skip a full architect pass)

```
select-tenant/
  page.tsx (RSC)              — try/catch fetch, classifyMembershipCount,
                                 redirect on "single", builds SelectTenantScreenState
  loading.tsx (RSC, Suspense fallback) — skeleton, no props
  select-tenant.i-vm.ts        — SelectTenantScreenState union (shared contract)
  select-tenant.tsx ("use client")
    ├─ error branch            — message + retry button (useTransition + router.refresh)
    ├─ empty branch            — message + <form action={logoutAction}> (imported from ../login/actions)
    └─ cards branch            — heading/subheading/footnote + grid of:
         TenantCard × N (components/shared/tenant-card, REUSED unchanged)
           └─ TenantLogo (components/shared/tenant-card, REUSED unchanged)
       activation controller: runSwitchActivation (components/shared/tenant-card, REUSED unchanged)
```

**fe-component-architect: skip.** This phase is presentation composition over
an already-designed contract (`TenantCardViewModel`, `TenantCardStatus`,
`SwitchTenantResult`, `TenantCard`, `runSwitchActivation` all fixed by
US-E23.1) — there is no new component *system* to design, only a new
container wiring three existing screen-states together. A full architect pass
would relitigate decisions already made and documented in this plan.

**fe-state-engineer: skip.** State stays RSC-first: `page.tsx` does the
one-shot server fetch (no TanStack Query — matches US-E23.1's Header
precedent of sitting outside `ReactQueryProvider`), the only client state is
local `useState`/`useTransition` (per-card loading/error mirroring
`TenantSwitchDialog`'s existing pattern, plus the retry button's own pending
flag). No server-cache invalidation concern exists here (this screen is
visited once, pre-workspace, then never revisited in the same session absent
a deep-link-back edge case already covered by NFR-006/AC-005.8 — which is
satisfied by construction: the screen holds no client-cached tenant data at
all, everything renders fresh from the server call each time `page.tsx` runs).

## 4. ADR check

- **No new design token.** Layout reuses `screens.login`'s auth-shell tokens;
  card grid reuses `TenantCard`'s existing token set (already ADR'd/reviewed
  under US-E23.1). Skeleton shimmer uses existing `bg-muted`/motion-safe
  conventions, no new token.
- **No ADR for the i18n namespace split** (`tenant.switch.postLogin.*`) —
  this is normal per-screen namespacing already established by `.claude/rules/i18n.md`,
  not a cross-cutting decision.
- **No ADR for Decision B** (`router.refresh()` as the retry mechanism) — see
  reasoning in §1; it's an implementation-pattern choice reusing an existing
  Next primitive, not an architecture/auth/token/contract change. Flagging it
  to fe-lead as a named decision in this plan is enough; register only if
  fe-lead wants it durable beyond this packet.
- **RESOLVED (fe-lead, 2026-07-19)**: the single-membership "skip" branch
  (Phase 2 step 3) is a real gap, not a defensive backstop — no auto-mint
  exists today. It must call `switchTenantAction(sole.tenantId, sole.roles[0] ?? "")`
  directly from `page.tsx` (server-side call, not a client boundary), per the
  corrected Phase 2 §3 above. Not architecture-adjacent enough for a new ADR
  (reuses the existing FR-004 action verbatim, no new contract) — proceed as
  corrected.

## 5. Open questions (carried + new)

- `[CARRIED]` Double-activation guard on a single card mid-pending — already
  resolved identically to US-E23.1: `runSwitchActivation`'s single
  `loadingTenantId` slot + `TenantCard`'s `disabled={isLoading}` already
  prevents this by construction (reused unchanged) — no new work needed,
  just confirm the container wires the same guard `TenantSwitchDialog` uses
  (`if (loadingTenantId !== null) return;` before starting a new activation).
- `[CARRIED]` Request de-dupe on rapid re-navigation — RSC fetch is inherently
  single-flight per navigation (no client cache to race); not a client
  concern here. No action needed.
- `[RESOLVED]` Whether the single-membership branch's `redirect()` is the
  actual entry mechanism or a defensive backstop — see §4 above: it must call
  `switchTenantAction` directly, verified against `access-guard.ts` +
  `login/actions.ts` + `US-001-tenant-path-resolver`'s `design.md` (no
  auto-mint exists today).
- `[NEW, minor]` FR-005 footnote's "conditional on US-E23.1 having shipped" —
  US-E23.1 is already merged to `main` (confirmed: `docs/decisions` /
  TEST_MATRIX shows it `implemented`), so by the time this story ships the
  condition is trivially true. Recommend: **do not build a feature-flag/version
  check** — just always render the footnote (US-E23.1 is a completed
  precondition of this story's own timeline, not a runtime toggle). Flag this
  simplification to fe-lead; it removes a speculative conditional the spec
  wrote defensively before sequencing was known.
- `[NEW, minor]` EN pluralization of the subheading count (`{count} trường`
  has no VI plural form, EN "school"/"schools" might want one) — decide the
  exact ICU shape at implementation time; not blocking.
