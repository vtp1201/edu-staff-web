---
title: FE Engineering Plan — US-E23.1 Tenant Switch Menu
status: planned
lane: high-risk
inputs:
  - spec.md (consolidated BA deliverable — FR-001..010, NFR-001..008, UC-001..006, AC-001..025)
  - use-cases.md, requirements.md, integration.md
  - design_src/edu/tenant-switch.jsx (visual reference only, decision 0011)
  - docs/product/design-spec.jsonc → screens.tenantSwitch (verified this session)
---

# Plan — US-E23.1 Tenant Switch Menu

## 0. Headline risks (read first — these are the two ways this story breaks)

### Risk A — `redirect()` throw vs application-error throw (blocks FR-004/006/008/009)
`switchTenantAction(tenantId, role)` (`src/app/[locale]/(auth)/select-tenant/actions.ts`)
calls `useCase.execute(tenantId)` (throws `ApiError` on non-2xx, nothing catches it
in the action) then unconditionally `redirect(...)` from `@/bootstrap/i18n/routing`
on success — `redirect()` throws a `NEXT_REDIRECT` digest internally; this is
control flow, NOT an error.

The header dialog **is new client code that wraps this action in a try/catch**
(FR-008/009 need to catch 403 vs 5xx and set per-card error state). That wrapper
MUST:
1. Detect the Next redirect throw (`isRedirectError()` from
   `next/dist/client/components/redirect-error` is the framework's own guard —
   confirm import path against installed Next version; do not hand-roll digest
   string matching) and **rethrow it immediately, unchanged**.
2. Only classify genuine `ApiError`-shaped throws (has `.status`/`.code`) into
   the 403-inline-error (FR-008) vs toast-and-retry (FR-009) branches.
3. Never wrap the call in a way that swallows the redirect (e.g. a blanket
   `catch (e) { setError(...) }` with no rethrow-check is the exact bug to avoid).

Existing `select-tenant.tsx` gets away without this because it has NO try/catch
around `onSelect` at all — this story is the first consumer that needs one.
**Flag to fe-nextjs-engineer as a named implementation note, not buried in a
generic "handle errors" phase item.**

### Risk B — Dialog opened from inside an already-open DropdownMenu (Radix nesting)
Design spec + UX requires: click "Đổi trường" `DropdownMenuItem` → dropdown
closes → `TenantSwitchDialog` opens. Radix's own close-then-open-adjacent-overlay
sequencing is a known gotcha (dropdown's close-focus-restore can fight the
dialog's open-focus-trap; a manually-opened `Dialog` — i.e. no `DialogTrigger`
child — has a documented latent defect in this codebase where focus does not
correctly restore on close, per team memory from a prior story).

Recommended pattern (confirm against how the prior story worked around it,
grep `git log -S"onOpenChange"` / search prior nested-overlay fix commits before
implementing from scratch):
- Controlled `dialogOpen` boolean state in the Header (or a small
  `TenantSwitchMenuItem` wrapper), set to `true` in the `DropdownMenuItem`'s
  `onSelect` handler with `event.preventDefault()` **only if** default dropdown
  auto-close-and-refocus-trigger fights the dialog (verify empirically — Radix
  `onSelect` closing the menu is usually fine; the risk is the *focus restore*
  target once the dialog later closes, not the initial open).
- Render `<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>` **outside/
  adjacent to** the `DropdownMenu` in the Header's JSX tree (sibling, not
  descendant), so the dialog's mount/unmount and focus trap are independent of
  the dropdown's own portal lifecycle.
- On dialog close, explicitly return focus to the user-menu trigger button
  (store a ref to the `DropdownMenuTrigger`'s button) rather than relying on
  Radix's default restore, if the prior story's fix pattern used explicit
  focus management — reuse that exact pattern for consistency.
- Busy-blocked dismiss (FR-006): `onOpenChange` must ignore close attempts
  while any card is loading (check `loadingTenantId !== null` before allowing
  `setDialogOpen(false)`), matching the jsx reference's backdrop-click guard.

Both risks are Phase 4 concerns but are called out here because they shape the
component contract in Phase 0/3 (dialog must accept controlled `open`, not
manage its own).

## 0.5. Blocking gap to surface to fe-lead — FR-010 assumes unbuilt infra

FR-010 ("401 mid-flow... rely on the existing reactive-refresh interceptor to
retry once") assumes a reactive 401→refresh→retry interceptor is live. Verified
this session: `src/bootstrap/lib/http.ts` still has the comment "reactive
401→refresh→retry safety net is **deferred to a follow-up story**"
(`.claude/rules/api-integration.md` §Token flow says the same — reactive +
single-flight refresh is `[DEFERRED]`). **No such interceptor exists yet.**

This means AC-004.8 (401-mid-flow retry-once success path) cannot pass as
written — a 401 from `POST /members/switch-tenant` will currently surface as a
plain `ApiError({status:401})`, which (absent other handling) falls into the
generic FR-009 network/5xx bucket instead of FR-010's distinct retry path.

**Do not silently build a one-off retry-once shim inside this story's action**
(that would duplicate/pre-empt the real cross-cutting interceptor work and
diverge from decision 0018's single-flight design). Recommend: flag this gap
to `fe-lead` now; either (a) descope AC-004.8 to "401 treated as FR-009 failure
today, revisit when reactive interceptor ships" with an explicit note in the
packet, or (b) fe-lead decides the reactive interceptor becomes a prerequisite
sub-task before this story can close AC-004.8. This is an ADR-adjacent/gap
call, not a plan detail — surfacing it, not deciding it.

## Phase 0 — Contracts & shared-component placement (no code, decide-and-record)

- **Domain**: `TenantMembership` (`tenantId`, `roles`, `status`) is confirmed
  wire-accurate (IAM `MembershipSummary`) — **no change**. Do not widen the
  domain entity with display fields (name/address/color); those are
  presentation-only enrichment, kept out of `domain/` per Clean Architecture.
- **New presentation-facing type** (fe-component-architect to finalize): a
  `TenantCardViewModel` (or similar `.i-vm.ts`) = `TenantMembership` widened
  with mock-sourced `tenantName`, `address`, `logoColor`, plus `isCurrent`,
  `isSwitchable` (`status === "ACTIVE"`), and a loading-state flag consumed by
  `TenantCard`. Lives with the shared component (see below), not inside
  `features/tenant/domain/`.
- **Shared component home (decision 0026 applies from day one, not
  build-then-promote)**: `US-E23.2`'s own `story.md` (packet sibling, read this
  session) explicitly says it shares "the same `TenantCard` concept, identical
  display data shape" with this story, and `design-spec.jsonc`'s second entry
  (post-login select) says `"cardComponent": "TenantCard (same as
  screens.tenantSwitch.dialog.tenantCard...)"` — the reuse is not speculative,
  it's spec-mandated and imminent. Place `TenantLogo` + `TenantCard` directly
  in **`src/components/shared/tenant-card/`** (folder + `index.ts` +
  `.stories.tsx`) from the start. `TenantSwitchDialog` (the modal shell) stays
  local to this story (`components/shared/` only if/when E23.2 proves it needs
  the *dialog* shell too — E23.2 is a full-page grid, not a dialog, so the
  dialog itself is likely NOT shared, only `TenantCard`/`TenantLogo` are).
- **Mock display-lookup home**: `src/features/tenant/infrastructure/mocks/
  tenant-display.mock.ts`, `server-only`, exporting
  `resolveTenantDisplay(tenantId): { tenantName, address, logoColor }` with a
  deterministic fallback for unknown ids (derived initial + default color) so
  both this story's `layout.tsx` enrichment and (later) E23.2's page can call
  the same function — gated by `USE_MOCK` from `bootstrap/lib/mock.ts`. This is
  NOT inside `domain/` or the mapper; it's an infra-side enrichment helper
  called from the RSC layer.
- **Redirect-throw handling** (Risk A) and **dialog-open contract** (Risk B —
  dialog takes controlled `open`/`onOpenChange`, never self-manages open state)
  are locked in now so Phase 3/4 don't re-litigate them.

Done when: fe-component-architect has a written `TenantCardViewModel` shape +
confirms `components/shared/tenant-card/` placement; fe-state-engineer confirms
no TanStack Query is used here (Header/AppShell sit outside `ReactQueryProvider`
per US-E22.1 precedent — this is server-fetched props + local component state,
not server-cache state).

## Phase 1 — Domain (confirm, no new code)

Reuse as-is: `src/features/tenant/domain/{entities/tenant-membership.entity.ts,
repositories/i-tenant.repository.ts, use-cases/{list-my-memberships,
switch-tenant}.use-case.ts}`. `isSwitchable()` helper already encodes the
ACTIVE-only rule (FR-004's target-must-be-switchable check reuses this, do not
reimplement).

Test first: none — no behavior change. If engineer touches this layer at all,
that itself is a red flag to re-check Phase 0.

Done when: confirmed zero diff in `features/tenant/domain/`.

## Phase 2 — Server-side data threading (layout.tsx enrichment)

Files:
- `src/features/tenant/infrastructure/mocks/tenant-display.mock.ts` (new,
  `server-only`) — `resolveTenantDisplay(tenantId)`.
- `src/app/[locale]/t/[tenant]/(app)/layout.tsx` (extend, same pattern as
  US-E22.1's `profile` fetch already there): after existing `decodeTenantId`/
  `evaluateAccess`, add
  `const memberships = await makeListMyMembershipsUseCase().then(uc =>
  uc.execute()).catch(() => [])` (fail-closed empty array per FR-002/007
  fallback — a fetch failure degrades to "menu item hidden", not a crash);
  enrich each membership via `resolveTenantDisplay`; derive `currentTenantId =
  tokenTenantId` (already computed in the layout for the guard — reuse the
  same variable, do not re-decode); pass `memberships` (enriched
  `TenantCardViewModel[]`) + `currentTenantId` + `switchTenantAction`
  (imported from `select-tenant/actions.ts`, passed as server-action-as-prop,
  same convention as `onRequestEmailVerification`) into `<AppShell>`.
- `src/components/layout/app-shell/app-shell.tsx` (extend `AppShellProps`):
  thread `memberships`/`currentTenantId`/`onSwitchTenant` down into `<Header>`.

Test first: none at this layer beyond existing type-check (RSC composition,
no isolated unit target) — the meaningful proof is the Phase 6 layout-level
test asserting fail-closed `[]` on a rejected `listMyMemberships()` promise,
and that `resolveTenantDisplay` returns the deterministic fallback shape for
an unknown id (pure function — cheap unit test, write this one first).

Done when: `layout.tsx` compiles, passes enriched props through unchanged
data (verify via a light RSC/unit test on `resolveTenantDisplay`, and a
component-level test on `AppShell` receiving the new props — deferred detail
to Phase 6).

## Phase 3 — Presentational components (`components/shared/tenant-card/`)

Files:
- `components/shared/tenant-card/tenant-logo.tsx` — logo/initial, size prop
  (36 for header block per `userMenuBlock.tenantLogo`, 56 for dialog cards per
  `dialog.tenantCard.logoSize` — confirm both from `design-spec.jsonc`), uses
  **real tokens** (`bg-primary/10`-style opacity conventions per
  `.claude/rules/design-system.md` Badge/StatCard patterns), NOT the jsx
  reference's literal `tenant.color + '1A'` string concatenation — that's a
  visual reference only (decision 0011). If per-tenant color truly needs a
  dynamic value not expressible as a static Tailwind class, use `style=
  {{ '--tenant-color': logoColor }}` + a token-referencing CSS custom property,
  not raw hex/rgba composed at runtime.
- `components/shared/tenant-card/tenant-card.tsx` — real `<button>`, `isCurrent`
  → "Hiện tại" badge via the **existing shared `Badge`/`StatusBadge`**
  component (grep `components/shared` before writing — do not hand-roll a new
  badge), `aria-current`, `aria-busy` while loading, composed `aria-label`
  string (name + address + role + current-state), per-card spinner + sr-only
  "Đang chuyển…" text.
- `components/shared/tenant-card/tenant-switch-dialog.tsx` (local-ish, but
  physically colocated here since it composes `TenantCard`) — controlled
  `open`/`onOpenChange` props (per Risk B), Tab-loop/Escape/backdrop-click
  handled by the underlying shadcn `Dialog` primitive (verify Radix's built-in
  focus trap is sufficient — likely yes, the jsx reference's manual focus-trap
  code predates using the shared `Dialog` primitive and may be redundant here).
  Busy-blocked dismiss: `onOpenChange` guards on `loadingTenantId !== null`.
- `.stories.tsx` for each — states: default grid, current-tenant badge, one
  card loading, 403-inline-error on one card, empty (0 switchable — degenerate,
  shouldn't reach the dialog per zero-noise rule but story should still cover
  it defensively), single membership (dialog shouldn't even be reachable, but
  `TenantCard` itself should still render correctly in isolation).

Test first: Storybook interaction tests — render dialog with 2/1/0-membership
fixtures, assert card count, assert `aria-current` on the matching card,
assert Tab does not escape the dialog, assert Escape/backdrop-click no-op
while a card's `loadingTenantId` is set (simulate via a play function that
sets loading state then attempts dismiss).

Done when: story states green, matches `design-spec.jsonc` `screens.
tenantSwitch.dialog` values (maxWidth 440, card minHeight 80/logoSize 56,
hover/focus treatments), passes design-review gate checklist locally before
handoff.

## Phase 4 — Header wiring (menu item + dialog trigger + switch invocation)

Files:
- `components/layout/app-shell/header/header.tsx` — extend `HeaderProps` with
  `memberships: TenantCardViewModel[]`, `currentTenantId: string`,
  `onSwitchTenant: (tenantId: string, role: string) => Promise<void>`. Add:
  - Header user-menu block: `TenantLogo` (36px) + role badge for the current
    membership (FR-007) — fallback to role-only (no logo/name) if
    `currentTenantId` doesn't match any membership (stale token / fetch
    failure — AC-001.2/001.3), never crash.
  - `DropdownMenuItem` "Đổi trường" — **rendered only when
    `memberships.length >= 2`** (zero-noise rule, FR-002) — sets controlled
    `dialogOpen = true` (Risk B pattern).
  - `TenantSwitchDialog` rendered adjacent to (not nested inside)
    `DropdownMenu`, controlled by `dialogOpen`.
  - Switch invocation: per-card `onClick` → guard no-op on already-current
    card (FR-005) → set `loadingTenantId` → call `onSwitchTenant(tenantId,
    membership.roles[0] ?? "")` (reuse the established first-role convention
    from `select-tenant.tsx`, per BA note — no new role-picker UX) wrapped per
    **Risk A**'s redirect-safe try/catch → on caught `ApiError`: `status ===
    403` → inline card error (FR-008, keep dialog open, no nav, no cookie
    mutation — this is guaranteed by construction since redirect() is never
    reached in the 403 branch, just assert it in the test); else → toast +
    reset `loadingTenantId` to idle (FR-009); 401 → currently falls into the
    FR-009 branch too (see §0.5 gap) unless fe-lead directs otherwise.
- `components/layout/app-shell/app-shell.tsx` — pass the three new props
  through to `<Header>` (already receiving them from `layout.tsx` per Phase 2).

Test first: component/interaction test on `Header` — (a) 1-membership fixture
→ assert "Đổi trường" item absent (FR-002 zero-noise, negative assertion); (b)
2-membership fixture → item present → click → dialog opens → click non-current
card → `onSwitchTenant` called with correct `(tenantId, role)` args → loading
state shown on that card only; (c) inject a rejected-with-403-shaped promise
for `onSwitchTenant` → assert inline card error, dialog still open, no
navigation attempted; (d) inject a rejected-with-generic-error promise →
assert toast shown, card returns to idle, dialog stays open; (e) inject a
promise that throws a Next-redirect-shaped error → assert it propagates
(is NOT caught/swallowed as an application error) — this is the direct proof
for Risk A.

Done when: all five interaction cases pass; keyboard-only Tab through
dropdown→dialog→cards verified manually per `.claude/rules/accessibility.md`.

## Phase 5 — i18n

New namespace `tenant.switch.*` in `messages/{vi,en}.json` (vi source + en
mirror, both edited together per `.claude/rules/i18n.md`):
- `tenant.switch.menuItem` — "Đổi trường"
- `tenant.switch.dialogTitle`, `tenant.switch.dialogDescription`
- `tenant.switch.current` — "Hiện tại"
- `tenant.switch.switching` — sr-only "Đang chuyển…"
- `tenant.switch.error403` — inline card error copy (FR-008)
- `tenant.switch.errorGeneric` — toast copy (FR-009)

Open decision (flag to fe-lead/engineer, minor): spec.md says the empty-list
copy key is `tenant.select.empty` "reused" — but that namespace belongs to the
OTHER (pre-login, US-E23.2) screen. Since this story's dialog is only ever
reachable when `memberships.length >= 2` (zero-noise gate in Phase 4), the
empty-list case inside the dialog is a defensive/theoretical state, not a real
user path — recommend a distinct `tenant.switch.empty` key for namespace
hygiene (avoids cross-story coupling on a shared key two different features
both edit) rather than importing `tenant.select.*` into this component. Small
enough to decide at implementation time; not blocking.

Done when: `bunx tsc --noEmit` passes (typed messages catch key mismatches),
both locale files updated together.

## Phase 6 — Test matrix (TDD proof, red before green)

| Layer | Target | Proof |
| --- | --- | --- |
| Unit | `resolveTenantDisplay()` | known-id lookup + unknown-id deterministic fallback |
| Unit | `Header`'s error-branch classifier (403 vs generic vs redirect-passthrough) | pure function if extracted, else covered via interaction test in Phase 4 |
| Integration | `layout.tsx` membership fetch | fail-closed to `[]` on rejected `listMyMemberships()`, current-tenant matching against `tokenTenantId` |
| Storybook interaction | `TenantSwitchDialog` + `TenantCard` | Phase 3's state matrix (loading/current/error/empty) + focus-trap/dismiss-while-busy |
| Storybook interaction | `Header` | Phase 4's 5 cases, incl. the redirect-passthrough proof |
| Playwright E2E (optional per lane) | full switch flow in mock mode | menu item visible with 2 mock memberships → dialog → switch → land in new tenant route |

Add a `docs/TEST_MATRIX.md` row per `.claude/rules/tdd.md` at `planned` before
any code is written; flip to `implemented` only once the above proofs exist.

## Component + state sketch (summary)

```
AppLayout (RSC)                         — fetch memberships (fail-closed []),
                                           resolveTenantDisplay enrich, pass props
  └─ AppShell ("use client")             — thread props, no new state here
       └─ Header ("use client")          — dialogOpen, loadingTenantId (local state)
            ├─ user-menu block           — current TenantLogo + role badge
            ├─ DropdownMenu
            │    └─ DropdownMenuItem "Đổi trường" (gated len>=2)
            └─ TenantSwitchDialog (components/shared/tenant-card/)
                 └─ TenantCard × N (components/shared/tenant-card/)
                      └─ TenantLogo (components/shared/tenant-card/)
```

State classification: **server-fetched props** (memberships, currentTenantId
— RSC, not TanStack Query, matching the US-E22.1 precedent that Header/
AppShell sit outside `ReactQueryProvider`) + **local component state**
(`dialogOpen`, `loadingTenantId`, per-card inline error) — no Zustand, no
global store, no query cache needed here.

## Risks, dependencies, open questions

- **[BLOCKING-ISH]** §0.5 — FR-010/AC-004.8 assumes a reactive 401-retry
  interceptor that `.claude/rules/api-integration.md` marks deferred. Needs
  fe-lead decision before Phase 4 closes that AC.
- **[RISK]** §0 Risk A — redirect-vs-error throw handling; single highest
  silent-failure risk in this story.
- **[RISK]** §0 Risk B — nested Dropdown→Dialog focus management; reuse the
  prior story's fix pattern rather than re-deriving.
- **[OPEN QUESTION]** i18n empty-key reuse (`tenant.select.empty` vs new
  `tenant.switch.empty`) — recommend new key, see Phase 5.
- **[OPEN QUESTION]** Whether `TenantSwitchDialog` shell (not just
  `TenantCard`/`TenantLogo`) is ever reused by E23.2 — current read of E23.2's
  spec says no (it's a full page, not a dialog), so the dialog stays local to
  `components/shared/tenant-card/` alongside the components it composes,
  not promoted further. Revisit only if E23.2's actual implementation proves
  otherwise.
- **No new design token needed** — everything maps to existing tokens/shared
  components (`Badge`, `Dialog`, spinner treatment already used elsewhere);
  no ADR required for this story unless engineer finds a genuine gap during
  implementation.
