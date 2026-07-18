---
title: FE Component Architecture — US-E23.1 Tenant Switch Menu
status: finalized
lane: high-risk
author: fe-component-architect
inputs:
  - plan.md (fe-planner — placement/risk decisions already locked, not re-litigated here)
  - spec.md, story.md (this packet)
  - US-E23.2 story.md/spec.md (sibling, confirms shared TenantCard reuse claim)
  - docs/product/design-spec.jsonc → screens.tenantSwitch, screens.selectTenant
  - grep of src/components/ui/{badge,dialog}, src/components/shared/status-badge,
    src/components/layout/app-shell/{header,app-shell,header/role-switcher}.tsx,
    src/features/tenant/domain/entities/tenant-membership.entity.ts,
    src/app/[locale]/(auth)/select-tenant/actions.ts, src/app/tokens.css
---

# Architecture — US-E23.1 Tenant Switch Menu

This finalizes TypeScript contracts on top of `plan.md`'s locked decisions. It
does not re-decide placement (confirmed correct — see §0).

## 0. Placement confirmation (verified, not re-decided)

- `src/components/shared/tenant-card/` is the correct canonical home for
  `TenantLogo` + `TenantCard` — confirmed by reading US-E23.2's `story.md`/
  `spec.md` directly: both explicitly require an **identical** `TenantCard`
  data shape (`spec.md` §6 "must NOT diverge", §10 "do not implement two
  shapes") and `design-spec.jsonc`'s `selectTenant.cardGrid.cardComponent`
  literally says `"TenantCard (same as tenantSwitch.dialog.tenantCard...)"`.
  Decision-`0026` §2 (composed, reused by ≥2 screens → `components/shared/`)
  applies from day one — correct, no change from plan.md.
- `TenantSwitchDialog` stays colocated in the same folder
  (`components/shared/tenant-card/tenant-switch-dialog.tsx`) but is **not**
  itself a shared-reuse candidate: US-E23.2 is a full route/page
  (`(auth)/select-tenant/select-tenant.tsx`), not a dialog — confirmed by its
  spec (`layoutReuse`: reuses `screens.login`'s centered auth-shell, no
  dialog/overlay chrome). No promotion pressure on the dialog shell itself.
- Existing primitives reused as-is (no `ui/` edits needed):
  `components/ui/badge/badge.tsx` (via `StatusBadge` wrapper — do not import
  `Badge` directly for tone-based status, `StatusBadge` already owns the AA
  contrast-safe tone→class map), `components/ui/dialog/dialog.tsx` (`Dialog`,
  `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`,
  `DialogClose`). **No `bun ui:add` needed.**
- Notable existing capability that changes Risk B's severity (plan.md flagged
  this as open): `DialogContent` (`src/components/ui/dialog/dialog.tsx:58-64`)
  already wraps `onCloseAutoFocus` with `useDialogReturnFocus(true)`
  (`@/shared/use-dialog-return-focus`, built for US-E22.1 DEF-01 specifically
  to fix "controlled `open`, no `<DialogTrigger>` → focus lands on `<body>`").
  **This means the shared `Dialog` primitive already solves the exact
  focus-restore defect plan.md's Risk B worried about** — no bespoke
  trigger-ref-and-manual-refocus code is needed in `TenantSwitchDialog`; just
  use `<Dialog open={open} onOpenChange={onOpenChange}>` normally, sibling to
  the `DropdownMenu` in `Header`'s JSX, and the existing primitive's
  `onCloseAutoFocus` handles returning focus to whatever was previously
  focused (the "Đổi trường" `DropdownMenuItem`'s parent trigger button,
  since that's what had focus when the dialog opened). **Flag to
  fe-nextjs-engineer**: do not re-implement return-focus; verify empirically
  in the interaction test that focus lands back on the header's user-menu
  trigger button (not `<body>`), and only add explicit `triggerRef` handling
  if that verification fails.

## 1. Architecture Summary

- **Scope**: header user-menu "Đổi trường" item (zero-noise gated) +
  "Chọn trường" dialog + current-tenant header block. Almost entirely new
  presentation; zero new domain/use-case/infrastructure beyond the
  server-only mock-display lookup (owned by `fe-nextjs-engineer`, not this
  contract doc).
- **New components** (all in `components/shared/tenant-card/`):
  `TenantLogo` (presentational, sizeable), `TenantCard` (presentational,
  controlled interaction status), `TenantSwitchDialog` (container-ish
  presentational — owns no server data, but composes `TenantCard` + local
  per-card status derivation from props it's given).
- **Extended existing components**: `Header` (3 new optional props +
  internal `dialogOpen`/`loadingTenantId`/`errorByTenantId` local state),
  `AppShell` (pass-through of the same 3 props, no new state).
- **Missing primitives**: none. `Badge`/`Dialog` already exist and are
  sufficient.
- **Key decisions finalized here**:
  1. `TenantCardViewModel` is **pure display data** (membership + mock
     display fields + `isCurrent`/`isSwitchable`) — it does NOT carry a
     per-card loading/error flag (diverges slightly from plan.md's literal
     wording "plus a loading-state flag consumed by TenantCard"; rationale
     in §4). Loading/error is transient UI state, owned by
     `TenantSwitchDialog`, passed into each `TenantCard` as a separate
     controlled `status` prop. This keeps the array plan.md/spec.md call
     "server-fetched props" (memberships) actually immutable/re-renderable
     without mutating list items in place.
  2. `logoColor` is a **closed enum of existing semantic tone tokens**
     (`"primary" | "success" | "warning" | "info" | "purple" | "teal"`), NOT
     an arbitrary per-tenant hex — resolution of the open question in the
     task brief. Full rationale in §5.
  3. Redirect-vs-error try/catch (Risk A) is owned by a small colocated
     helper, not inline in `Header` — `classifySwitchOutcome()` — kept in
     `components/shared/tenant-card/` since `TenantSwitchDialog` is the
     actual caller of `onSwitchTenant`, not `Header` (see §2 tree — the
     dialog invokes the switch, `Header` only owns `dialogOpen` + passes the
     membership list/action down). This is a refinement of plan.md Phase 4's
     wording ("Header... call `onSwitchTenant`... wrapped per Risk A") —
     moving the invocation one level down into `TenantSwitchDialog` keeps
     `Header` a thin composition point (menu item + current-tenant block +
     dialog wiring) and keeps all per-card busy/error state colocated with
     the component that renders it. `Header` still owns `dialogOpen` (needs
     it to gate the `DropdownMenuItem` and coordinate with the dropdown).

## 2. Component Tree

```
AppLayout  (RSC — src/app/[locale]/t/[tenant]/(app)/layout.tsx)
  — fetches memberships via ListMyMembershipsUseCase (fail-closed → []),
    enriches via resolveTenantDisplay(), derives currentTenantId from
    already-decoded tokenTenantId, passes switchTenantAction as prop.
  │
  └─ AppShell  ("use client", presentational passthrough — no new state)
       │  props: + memberships, currentTenantId, onSwitchTenant (passthrough only)
       │
       └─ Header  ("use client", CONTROLLER for this story's UI state)
            │  owns: dialogOpen (boolean), local to Header
            │
            ├─ user-menu block (existing DropdownMenu, extended)
            │    ├─ current-tenant row (NEW)
            │    │    └─ TenantLogo (shared, size=36)      [presentational]
            │    │    └─ StatusBadge (existing shared)      [reused as-is]
            │    └─ DropdownMenuItem "Đổi trường" (NEW)
            │         — rendered only when memberships.length >= 2
            │         — onSelect → setDialogOpen(true)
            │
            └─ TenantSwitchDialog (NEW, shared, sibling to DropdownMenu
               in JSX — not nested inside it, per Risk B)
                 │  props: open, onOpenChange, memberships, currentTenantId,
                 │         onSwitchTenant
                 │  owns: loadingTenantId (string | null),
                 │        errorByTenantId (Record<string, CardErrorState>)
                 │        — both local state, reset on dialog close
                 │
                 ├─ Dialog / DialogContent / DialogHeader / DialogTitle /
                 │    DialogDescription  (existing ui/dialog primitives, reused)
                 │
                 └─ TenantCard × N (shared)                 [presentational,
                      props: viewModel (TenantCardViewModel),  controlled]
                             status (TenantCardStatus),
                             onActivate
                      │
                      └─ TenantLogo (shared, size=56)
                      └─ StatusBadge × (role badge, "Hiện tại" badge)
```

Annotations:
- `AppLayout` = RSC, server-only data fetch + enrichment (not this doc's
  contract to finalize in code, but its **output shape** is
  `TenantCardViewModel[]` + `currentTenantId: string` — see §3).
- `AppShell`, `Header` = `'use client'`.
- `TenantSwitchDialog`, `TenantCard`, `TenantLogo` = `'use client'` (they live
  under a `'use client'` boundary already; `TenantCard`/`TenantLogo` are pure
  presentational/controlled — no internal data fetching, no `useEffect`
  side-channel state beyond what's passed in).
- **Controlled vs uncontrolled**: `TenantSwitchDialog`'s `open` is fully
  controlled by `Header` (Risk B requirement — never self-managed).
  `TenantCard`'s `status` is fully controlled by `TenantSwitchDialog` (no
  internal loading state inside `TenantCard` itself — keeps it a pure
  presentational leaf, trivially covered by Storybook args).

## 3. ViewModel + Prop Interfaces

### 3.1 `src/components/shared/tenant-card/tenant-card.i-vm.ts` (NEW)

```ts
import type {
  MembershipStatus,
  TenantMembership,
} from "@/features/tenant/domain/entities/tenant-membership.entity";

/**
 * Closed enum of existing semantic tone tokens (see architecture.md §5 —
 * resolves the "arbitrary per-tenant hex" question). Reuses the same tone
 * vocabulary as `StatusTone` (components/shared/status-badge) restricted to
 * the subset with a `bg-edu-*` or `bg-primary` token already defined in
 * `src/app/tokens.css`. Mock-sourced (`resolveTenantDisplay`), deterministic
 * per tenantId (e.g. hash tenantId into this fixed set) — never a raw hex.
 */
export type TenantAccentTone =
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "purple"
  | "teal";

/** Mock-sourced display fields — NOT on the IAM wire (confirmed absent from
 *  MembershipSummary, decision 0014 mock-first). Identical shape consumed by
 *  US-E23.1 (this story) and US-E23.2 (post-login select-tenant) — do not
 *  fork. Produced by `resolveTenantDisplay()` (infra-side mock lookup,
 *  server-only, owned by fe-nextjs-engineer — not part of this contract). */
export interface TenantDisplayFields {
  tenantName: string;
  address: string;
  logoColor: TenantAccentTone;
}

/** The card-list unit consumed by `TenantCard`/`TenantSwitchDialog`. Pure
 *  display data — no loading/error/interaction state (see architecture.md
 *  §4 for why that's kept separate). Built at the RSC layer
 *  (`layout.tsx`/`select-tenant/page.tsx`) by widening each
 *  `TenantMembership` with `TenantDisplayFields` + the two derived booleans
 *  below. Presentation-only type; domain/entities stay untouched. */
export interface TenantCardViewModel
  extends TenantMembership,
    TenantDisplayFields {
  /** true iff `tenantId` matches the caller's current-session tenantId
   *  (decoded from the access-token `tenantId` claim). US-E23.1's dialog
   *  computes this; US-E23.2's screen ALWAYS passes `false` (pre-entry, no
   *  current tenant yet — per design-spec.jsonc `selectTenant.cardGrid`). */
  isCurrent: boolean;
  /** `status === "ACTIVE"` — mirrors `isSwitchable()` from
   *  `tenant-membership.entity.ts`; duplicated as a boolean field (not a
   *  method) so it survives serialization across the RSC→client boundary. */
  isSwitchable: boolean;
}

/** Per-card transient interaction state — owned by `TenantSwitchDialog`
 *  (local state), NOT part of `TenantCardViewModel`. Passed into `TenantCard`
 *  as a controlled prop. */
export type TenantCardStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; reason: "forbidden" | "network"; messageKey: string };

/** Discriminant used by Header/TenantSwitchDialog's redirect-safe wrapper
 *  (Risk A) to classify a settled/thrown outcome of `onSwitchTenant()`. Not
 *  a component prop — a shared classification result type used by
 *  `classifySwitchOutcome()` (helper, colocated in this folder, implemented
 *  by fe-nextjs-engineer per Phase 4/Risk A). Included here because
 *  `TenantSwitchDialog`'s prop-driven behavior (§3.4) depends on its shape. */
export type SwitchOutcome =
  | { kind: "redirected" } // NEXT_REDIRECT — must be rethrown, never reached as a UI branch
  | { kind: "success" }
  | { kind: "forbidden"; messageKey: string } // ApiError status 403
  | { kind: "network"; messageKey: string }; // ApiError 5xx/timeout/401-today (see §0.5 descope)

export type { MembershipStatus, TenantMembership };
```

### 3.2 `src/components/shared/tenant-card/tenant-logo.tsx` — prop interface

```ts
export interface TenantLogoProps {
  /** 36 (header user-menu block) | 56 (dialog/select-screen cards) — exact
   *  px values from design-spec.jsonc screens.tenantSwitch.userMenuBlock
   *  .tenantLogo.size / .dialog.tenantCard.logoSize. No third size unless a
   *  future screen needs one (no size enum abstraction yet — 2 call sites). */
  size: 36 | 56;
  tenantName: string;
  /** Closed enum, drives the tint/border classes (§5) — never a raw color. */
  accentTone: TenantAccentTone;
  /** Optional real logo asset URL — falls back to initials-from-tenantName
   *  when absent (mock-first has no logo asset yet, this is forward-looking
   *  for when BE ships one; NOT required for this story's initial ship). */
  logoUrl?: string;
  className?: string;
}
```

- Presentational, no state. Renders initials (first letter(s) of
  `tenantName`, same derivation pattern `Header` already uses for the avatar
  fallback) inside a rounded box sized per `size`, tinted/bordered per
  `accentTone` (see §5 for the exact class mapping — reuses
  `statusToneClass()`-equivalent, does not duplicate that logic; either
  import a shared tone-class resolver or extend `status-badge.tsx`'s
  `TONE_CLASS` export surface — **flag to fe-nextjs-engineer**: prefer
  exporting a reusable `toneBgClass(tone)`/`toneBorderClass(tone)` pair from
  `status-badge.tsx` over duplicating a second tone map in `tenant-logo.tsx`,
  to avoid the exact "status styling lattice repeated inline" smell
  `component-organization.md` warns about).

### 3.3 `src/components/shared/tenant-card/tenant-card.tsx` — prop interface

```ts
export interface TenantCardProps {
  viewModel: TenantCardViewModel;
  status: TenantCardStatus;
  /** Called on activation (click/Enter/Space — native <button> semantics
   *  handle the keyboard case for free). No-op guard for the current card
   *  (FR-005) is the CALLER's responsibility (TenantSwitchDialog), not
   *  TenantCard's — TenantCard is a dumb presentational leaf; it always
   *  calls onActivate and lets the parent decide whether to no-op, so
   *  Storybook can exercise the click path unconditionally. */
  onActivate: (tenantId: string) => void;
  className?: string;
}
```

- Real `<button type="button">`. `disabled={status.kind === "loading"}`
  (also naturally guards the double-activation-while-busy open question from
  plan.md — resolved: standard disabled-while-busy, confirmed here).
- `aria-current={viewModel.isCurrent ? "true" : undefined}`.
- `aria-busy={status.kind === "loading"}`.
- One composed `aria-label` built from a single i18n template key
  (`tenant.switch.cardAriaLabel`, interpolated with name/address/role/
  current-state — see §6) — NOT concatenated ad hoc in JSX; the interpolation
  values are passed to `t()`, translation happens in this Client Component.
- Visible "Hiện tại" badge via `StatusBadge` (`tone="success"`, matches
  design-spec `currentBadge.color: var(--edu-success)`), only when
  `viewModel.isCurrent`. Role badge via `StatusBadge` with the tone derived
  from the existing `ROLE_DOT`-equivalent role→tone mapping (reuse the
  **same 4-value role enum already in design-system.md's "Role → màu"**
  table — teacher→primary, principal→success, student→warning,
  parent→purple — do NOT invent a second role-color map; if `role-switcher
  .tsx`'s `ROLE_DOT` only maps to raw `bg-edu-role-*` classes and
  `StatusBadge`'s `StatusTone` doesn't yet have a 1:1 name for each role
  token, that's a 4-line lookup object inside `tenant-card.tsx`, not a new
  shared component).
- Per-card loading region: `role="status"` + `aria-live="polite"` wrapping a
  spinner + sr-only text from `tenant.switch.switching` (`"Đang chuyển…"`).
- Per-card inline error (403 case, `status.kind === "error"`): visible text
  from `status.messageKey`, `role="alert"` region scoped to the card (not a
  toast — FR-008 is explicitly card-inline, distinct from FR-009's toast).

### 3.4 `src/components/shared/tenant-card/tenant-switch-dialog.tsx` — prop interface

```ts
export interface TenantSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberships: TenantCardViewModel[];
  onSwitchTenant: (tenantId: string, role: string) => Promise<void>;
}
```

- Controlled `open`/`onOpenChange` only — never self-manages open state
  (Risk B, confirmed unchanged from plan.md).
- Internal state (not props): `loadingTenantId: string | null`,
  `errorByTenantId: Record<string, TenantCardStatus>` (or a single
  `activeError: { tenantId: string; status: TenantCardStatus } | null` since
  only one card can be mid-flow at a time given the disabled-while-busy
  rule — **prefer the single-slot form**, simpler and matches "only one
  in-flight switch" reality; reset both to idle on `onOpenChange(false)`
  and on dialog re-open).
- `onOpenChange` wrapper: ignores `false` transitions while
  `loadingTenantId !== null` (FR-006 busy-blocked dismiss) — i.e.
  `TenantSwitchDialog` intercepts the raw `onOpenChange` from its `open`
  prop plumbing before forwarding to the underlying `<Dialog>`:
  ```ts
  function handleOpenChange(next: boolean) {
    if (!next && loadingTenantId !== null) return; // FR-006 guard
    onOpenChange(next);
  }
  ```
- Per-card activation handler (owns Risk A's try/catch — see §1 decision 3
  and §0.5 descope note applied):
  ```ts
  async function handleActivate(tenantId: string) {
    const target = memberships.find((m) => m.tenantId === tenantId);
    if (!target || target.isCurrent) return; // FR-005 no-op on current card
    setLoadingTenantId(tenantId);
    setCardError(null);
    try {
      await onSwitchTenant(tenantId, target.roles[0] ?? "");
      // success → redirect() already threw NEXT_REDIRECT above; unreachable
      // in practice, but no-op here if it somehow resolves without redirecting.
    } catch (err) {
      if (isRedirectError(err)) throw err; // Risk A — rethrow unchanged, never swallow
      const outcome = classifySwitchOutcome(err); // → SwitchOutcome
      if (outcome.kind === "forbidden") {
        setCardError({ tenantId, status: { kind: "error", reason: "forbidden", messageKey: outcome.messageKey } });
      } else {
        // network/5xx AND today's 401 (FR-010 descope, §0.5) both land here
        toast.error(t(outcome.messageKey));
      }
      setLoadingTenantId(null);
    }
  }
  ```
  (Sketch only, for contract clarity — not implementation code per this
  role's constraints; `fe-nextjs-engineer` writes the real body, TDD-first.)
- Empty-list defensive state: `memberships.length === 0` → render
  `tenant.switch.empty` copy instead of an empty grid (AC-004.2; per plan.md
  Phase 5, use a NEW distinct key, do not import `tenant.select.empty` from
  US-E23.2's namespace).

### 3.5 `Header` — extended prop interface

```ts
type HeaderProps = {
  role: Role;
  userName?: string;
  onMenuClick?: () => void;
  onRoleChange?: (role: Role) => void;
  // NEW (US-E23.1) — all optional, default to "feature absent" behavior so
  // existing Storybook stories (header.stories.tsx: Teacher/Student, no new
  // args) keep compiling unchanged:
  memberships?: TenantCardViewModel[]; // default [] → menu item + current-tenant block both absent
  currentTenantId?: string;
  onSwitchTenant?: (tenantId: string, role: string) => Promise<void>;
};
```

- `Header` derives `currentMembership = memberships.find(m => m.tenantId === currentTenantId)`.
  - Found → render `TenantLogo`(36) + role `StatusBadge` in the user-menu
    block (FR-007 happy path).
  - Not found (stale/foreign tenantId, or `memberships` empty from a fetch
    failure) → role-only fallback, exactly today's existing rendering, no
    crash (AC-001.2/001.3) — this is a pure `undefined`-check, no new error
    boundary needed.
- `DropdownMenuItem` "Đổi trường" rendered **only when
  `memberships.filter(m => m.isSwitchable).length >= 2`** (not raw
  `memberships.length` — a membership list could theoretically include a
  non-ACTIVE entry; the ≥2 threshold is over ACTIVE/switchable ones per
  spec.md's definition). `onSelect={(e) => { setDialogOpen(true); }}` — no
  `preventDefault()` needed unless empirical testing (Phase 4 interaction
  test) shows the dropdown's own close-and-refocus fights the dialog's open
  (plan.md Risk B already flagged this as "verify empirically, usually
  fine" — `DialogContent`'s existing `useDialogReturnFocus` makes this even
  more likely to be a non-issue, see §0).
- `Header` owns only `dialogOpen: boolean` — NOT `loadingTenantId`/
  `errorByTenantId` (those moved into `TenantSwitchDialog`, §1 decision 3).
- Renders `<TenantSwitchDialog open={dialogOpen} onOpenChange={setDialogOpen}
  memberships={memberships} onSwitchTenant={onSwitchTenant ?? noop}
  />` as a **sibling** to `<DropdownMenu>`, not nested inside it.

### 3.6 `AppShell` — extended prop interface

```ts
type AppShellProps = {
  // ...existing fields unchanged...
  memberships?: TenantCardViewModel[];
  currentTenantId?: string;
  onSwitchTenant?: (tenantId: string, role: string) => Promise<void>;
};
```
Pure passthrough into `<Header memberships={memberships} currentTenantId=
{currentTenantId} onSwitchTenant={onSwitchTenant} .../>` alongside the
existing `role`/`userName`/`onMenuClick`/`onRoleChange` props — no new
`AppShell`-level state, matching plan.md Phase 2's "no new state here."

### 3.7 RSC layer output shape (contract only, not this role's code)

`layout.tsx` must produce, per plan.md Phase 2 (confirmed, not changed):
```ts
const memberships: TenantCardViewModel[] = rawMemberships.map((m) => ({
  ...m,
  ...resolveTenantDisplay(m.tenantId), // { tenantName, address, logoColor }
  isCurrent: m.tenantId === currentTenantId,
  isSwitchable: isSwitchable(m), // reuse existing domain helper, do not reimplement
}));
```
`resolveTenantDisplay(tenantId): TenantDisplayFields` lives at
`src/features/tenant/infrastructure/mocks/tenant-display.mock.ts`
(server-only, plan.md Phase 2/0 — unchanged). Its `logoColor` MUST return a
`TenantAccentTone` value (one of the 6 closed-enum strings), never a hex —
this is the one place the enum-vs-hex decision (§5) actually gets
constructed, so it's worth restating here: `fe-nextjs-engineer` should derive
it deterministically (e.g. a small ordered list of `TenantAccentTone`,
indexed by `hashString(tenantId) % list.length`), not `Math.random()`
(determinism matters for Storybook/test snapshot stability).

## 4. State Ownership (contract level)

| State | Owner | Kind | Notes |
| --- | --- | --- | --- |
| `memberships: TenantCardViewModel[]` | RSC (`layout.tsx`) → prop | server-fetched prop (RSC, not TanStack Query — matches US-E22.1 precedent, Header/AppShell sit outside `ReactQueryProvider`) | fail-closed to `[]` on fetch failure (already decided, plan.md Phase 2) |
| `currentTenantId: string` | RSC (`layout.tsx`, reuses already-decoded `tokenTenantId`) → prop | server-derived prop | do not re-decode in a client component |
| `dialogOpen: boolean` | `Header` | local UI state | controls `TenantSwitchDialog`'s `open` prop; never lifted higher, never owned by the dialog itself (Risk B) |
| `loadingTenantId` / `cardError` (single-slot, §3.4) | `TenantSwitchDialog` | local UI state | reset on close/reopen; NOT part of `TenantCardViewModel` (§1 decision 1) |
| `TenantCard`'s own render | `TenantCard` | none — fully controlled via `status` prop | zero internal state; trivial to story/test in isolation |

**Hand-off note to `fe-state-engineer`**: confirm no TanStack Query is
warranted anywhere in this tree (plan.md already asserts this — Header/
AppShell precedent from US-E22.1). The only thing resembling "server cache"
here is the RSC-level `listMyMemberships()` call, which is a one-shot
per-request fetch, not a client-side cache key — there is no
invalidation/refetch surface in this story (a switched tenant causes a full
navigation via `redirect()`, which naturally re-runs the RSC on the next
request; no client cache to invalidate). Please confirm this reading during
your own Phase 0 sign-off before Phase 2 implementation starts.

## 5. Resolution: `logoColor` / tokens-only (the flagged open question)

**Decision: `logoColor` is a closed enum of existing semantic tone tokens,
not an arbitrary per-tenant hex.**

Rationale:
- The jsx reference's `tenant.color + '1A'` (arbitrary runtime hex + manual
  alpha-hex suffix concatenation) is explicitly a **visual reference only**
  (decision `0011`) — it is not itself evidence that tenants need infinite
  distinct colors, only that the mock designer picked *some* color per card
  to differentiate them visually.
- `src/app/tokens.css` has no per-tenant/arbitrary color token family (only
  the closed `--edu-role-*` 4-value set and the closed semantic set
  `primary/success/warning/error/info/purple/teal/muted` used by
  `StatusBadge`'s `StatusTone`). Introducing a genuinely arbitrary
  runtime-computed color (inline `style` with a raw hex, or a CSS custom
  property fed a raw hex from mock data) would violate
  `.claude/rules/design-system.md`'s "KHÔNG raw color" rule and
  `tailwind-v4.md`'s "no inline style except dynamic values" — a per-tenant
  hex is exactly the kind of "dynamic value" that rule is trying to allow
  for *legitimate* cases (computed width/transform), but color is not a
  legitimate case here since the design system already owns color.
- Practically: `resolveTenantDisplay()` (the mock lookup) picks one of a
  **fixed 6-value enum** (`TenantAccentTone`) deterministically per
  `tenantId` (§3.7). `TenantLogo`/`TenantCard` then consume it via existing
  Tailwind semantic classes (`bg-primary/15`, `bg-edu-info/15`,
  `bg-edu-purple/15`, `bg-edu-teal/15`, etc. — the exact same `/15` tint
  convention `StatusBadge`'s `TONE_CLASS` already uses, decision matches
  design-system.md's Badge pattern) — **no inline `style`, no CSS custom
  property, no ADR needed.**
- This is deliberately **not** role-color-driven (i.e. not literally reusing
  `ROLE_DOT`/the 4-value role enum) — a tenant's brand accent and a
  membership's role are different axes (a teacher at one school and a
  teacher at another school should visually differ card-to-card, otherwise
  every "teacher" card across every tenant would look identical, defeating
  the purpose of a distinguishing accent in a multi-tenant list). The
  6-value `TenantAccentTone` enum reuses the SAME underlying tokens the role
  map draws from (`primary`≈teacher's `--edu-role-teacher`, etc.) plus the
  two extra hues (`info`, `teal`) already defined and unused by the role
  map, giving enough visual variety without inventing new tokens.
- **No ADR required** — no new token, purely a closed-enum consumption
  pattern over tokens that already exist.

## 6. Composition & Variant Strategy

- **No compound-component/slot pattern needed** — `TenantCard`/`TenantLogo`
  are simple props-in components, not a compound family (`Card.Root`/
  `Card.Header` etc. would be over-abstraction for 2 call sites per
  `component-organization.md`'s "no over-abstraction until 3+ instances").
- **`cva` variants**: none needed on `TenantLogo`/`TenantCard` themselves —
  `size: 36 | 56` and `accentTone` are simple prop-driven `cn()` branches,
  not a `cva` variant matrix (only 2×6 = 12 combinations, no shared base
  needing formal variant API yet; revisit if a 3rd size/tone axis appears).
- **Reused design-system patterns**: `Badge`/`StatusBadge` (current-tenant +
  role badges, matches design-spec's `currentBadge`/`roleBadge` entries
  exactly), `Dialog` (focus-trap, already handles the return-focus defect
  class this story would otherwise hit), the `/15`-tint tone convention
  (matches `StatusBadge.TONE_CLASS`, reused not reinvented).
- **`asChild`/`Slot`**: `DropdownMenuTrigger asChild` and `DialogTrigger`
  usage patterns already exist elsewhere in this codebase (`header.tsx`'s
  own `DropdownMenuTrigger asChild` with a `Button`) — `TenantSwitchDialog`
  does NOT use `DialogTrigger` (per Risk B, it's a controlled dialog with no
  trigger child; `Header`'s `DropdownMenuItem` sets `dialogOpen` directly
  instead of composing a trigger). No new `asChild` surface introduced.
- **Extension points, deliberately not built yet**: a `TenantLogo` `logoUrl`
  prop is speculative (real logo asset support) — included in the type for
  forward-compat but `fe-nextjs-engineer` should not build asset-loading
  logic this story; unknown/absent → initials fallback only.

## 7. Accessibility Contract

| Interactive node | Role/semantics | Label | Keyboard |
| --- | --- | --- | --- |
| "Đổi trường" `DropdownMenuItem` | `role="menuitem"` (Radix default) | visible text "Đổi trường" (i18n) + `switchHorizontal` icon (decorative, `aria-hidden`) | Enter/Space activates (native Radix menu-item behavior); item is absent entirely (not disabled) when gate fails — zero-noise, not a disabled affordance |
| Current-tenant header block | non-interactive display (no button semantics needed — it's informational, part of the existing user-menu trigger's visible content) | `TenantLogo` decorative (`aria-hidden` on the logo box itself; the surrounding `Avatar`/trigger button already carries `aria-label={t("userMenu")}`) | n/a — not independently focusable, part of the existing trigger button |
| `TenantSwitchDialog` | `role="dialog"` `aria-modal="true"` (Radix `DialogPrimitive.Content` default) | `DialogTitle` = "Chọn trường" (visible, satisfies `aria-labelledby` automatically via Radix), `DialogDescription` = short instructional copy | Tab loop (Radix focus-trap), Escape closes (guarded — see below), focus moves to first focusable element on open (Radix default — first focusable card or close button) |
| Dialog dismiss (Escape / backdrop click) | inherited from `Dialog`'s `onOpenChange` | n/a | **blocked while `loadingTenantId !== null`** (FR-006) — `TenantSwitchDialog`'s wrapped `handleOpenChange` intercepts, not a DOM-level `preventDefault` hack |
| `TenantCard` (`<button>`) | native `<button type="button">`, `aria-current={isCurrent ? "true" : undefined}`, `aria-busy={loading}`, `aria-disabled` implied by native `disabled` while loading | single composed `aria-label` = i18n template `tenant.switch.cardAriaLabel` interpolating name + address + role + (current-state clause, conditional) | native button semantics — Enter/Space activate; `disabled` while loading removes it from the tab order's *activatable* set but Radix/native browsers still show it in tab order as disabled (expected, matches WCAG for disabled controls) |
| Per-card loading region | `role="status"` `aria-live="polite"` wrapping visually-hidden text `tenant.switch.switching` ("Đang chuyển…") | n/a (announced via live region) | n/a, non-interactive |
| Per-card inline error (403) | `role="alert"` scoped to the card | visible error text from `tenant.switch.error403` | n/a, non-interactive; card itself remains focusable/re-activatable (idle again after error, per FR-008 "dialog stays open") |
| "Hiện tại" badge | `StatusBadge` (existing `Badge` under the hood) — text content "Hiện tại" (never color-only, matches design-spec `a11y` list item 2 and `.claude/rules/accessibility.md` "Status không CHỈ truyền bằng màu") | n/a (visible text is the label) | n/a, non-interactive |

All new copy funnels through `tenant.switch.*` (vi source + en mirror,
per `.claude/rules/i18n.md` — NOT this role's job to write the JSON, but the
key names referenced above — `menuItem`, `dialogTitle`, `dialogDescription`,
`current`, `switching`, `error403`, `errorGeneric`, `empty`,
`cardAriaLabel` — should be treated as the exact key names
`fe-nextjs-engineer` adds, to avoid a second round of naming drift between
this doc and `messages/{vi,en}.json`).

## 8. Follow-ups / flags carried forward (not this role's job to resolve)

- **Design-spec vs FR/AC divergence (new finding, flag to `fe-lead`)**:
  `design-spec.jsonc`'s `screens.tenantSwitch.dialog.switchFlow` and
  `.overlay` describe a full-screen `TenantSwitchOverlay` ("Đang tải dữ liệu
  {name}…", blur backdrop) between the per-card loading state and the
  workspace landing. **Neither `spec.md` nor `plan.md` mention this overlay
  component at all** — FR-004/AC-004.3–4 only specify per-card loading +
  success toast + navigation + dialog close, no intermediate full-screen
  overlay. This architecture doc does **not** add a `TenantSwitchOverlay`
  component to the tree (would be scope not backed by an FR/AC), but flags
  the discrepancy: either the design-spec entry is describing a richer
  interaction than what shipped-BE-latency reality needs (a real
  `POST /members/switch-tenant` + `redirect()` round-trip likely completes
  fast enough that a dedicated overlay is unnecessary — the per-card
  spinner + Next's own route-transition already cover the perceived-latency
  gap), or `fe-lead`/`ba-lead` should decide whether to add a follow-up
  AC for it. Not blocking this story.
- §0.5 FR-010/AC-004.8 descope — already resolved by `fe-lead`'s 2026-07-17
  decision note in `story.md`; `SwitchOutcome`'s `"network"` branch already
  absorbs today's 401 behavior per that decision, reflected in §3.1/§3.4.
