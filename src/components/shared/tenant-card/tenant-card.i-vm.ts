import type {
  MembershipStatus,
  TenantMembership,
} from "@/features/tenant/domain/entities/tenant-membership.entity";

/**
 * Closed enum of existing semantic tone tokens (architecture.md §5 — resolves
 * the "arbitrary per-tenant hex" question). Every value maps to a `bg-edu-*`/
 * `bg-primary` token already defined in `src/app/tokens.css`; consumed via the
 * same `/15`-tint convention `StatusBadge`'s `TONE_CLASS` uses. Mock-sourced
 * (`resolveTenantDisplay`), deterministic per tenantId — NEVER a raw hex.
 */
export type TenantAccentTone =
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "purple"
  | "teal";

/** Mock-sourced display fields — NOT on the IAM wire (confirmed absent from
 *  `MembershipSummary`, decision 0014 mock-first). Identical shape consumed by
 *  US-E23.1 (this story) and US-E23.2 (post-login select-tenant) — do not
 *  fork. Produced by `resolveTenantDisplay()` (server-only mock lookup). */
export interface TenantDisplayFields {
  tenantName: string;
  address: string;
  logoColor: TenantAccentTone;
}

/** The card-list unit consumed by `TenantCard`/`TenantSwitchDialog`. Pure
 *  display data — no loading/error/interaction state (kept separate, owned by
 *  `TenantSwitchDialog`). Built at the RSC layer by widening each
 *  `TenantMembership` with `TenantDisplayFields` + the two derived booleans. */
export interface TenantCardViewModel
  extends TenantMembership,
    TenantDisplayFields {
  /** true iff `tenantId` matches the caller's current-session tenantId
   *  (decoded from the access-token `tenantId` claim). E23.2 always passes
   *  `false` (pre-entry, no current tenant yet). */
  isCurrent: boolean;
  /** `status === "ACTIVE"` — mirrors `isSwitchable()`; duplicated as a boolean
   *  so it survives serialization across the RSC→client boundary. */
  isSwitchable: boolean;
}

/** Per-card transient interaction state — owned by `TenantSwitchDialog` (local
 *  state), NOT part of `TenantCardViewModel`. Passed to `TenantCard` as a
 *  controlled prop. */
export type TenantCardStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; reason: "forbidden" };

/**
 * Discriminated result of `switchTenantAction` (fe-lead decision Path A,
 * 2026-07-18). Defined here (a pure types module, no directive) so both the
 * `'use server'` action and the client components can share it without a
 * client→server-file import. On success the action `redirect()`s (throws
 * NEXT_REDIRECT) before returning, so `{ ok: true }` is effectively unreachable
 * from the client; the failure path returns a stable `errorKey` (never a raw
 * `ApiError` crossing the Server Action boundary). */
export type SwitchTenantResult =
  | { ok: true }
  | { ok: false; errorKey: "forbidden" | "network" };

export type { MembershipStatus, TenantMembership };
