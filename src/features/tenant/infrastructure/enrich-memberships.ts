import "server-only";
import type { TenantCardViewModel } from "@/components/shared/tenant-card";
import {
  isSwitchable,
  type TenantMembership,
} from "../domain/entities/tenant-membership.entity";
import { resolveTenantDisplay } from "./mocks/tenant-display.mock";

/**
 * Widen wire-accurate `TenantMembership[]` into presentation-ready
 * `TenantCardViewModel[]` (US-E23.1): attach mock-first display fields, mark the
 * caller's current tenant, and precompute `isSwitchable` as a serializable
 * boolean (the domain `isSwitchable()` method wouldn't survive the RSC→client
 * boundary). Shared by this story's `layout.tsx` and (later) US-E23.2's page —
 * one shape, no divergence (spec.md §6). `currentTenantId` is `null`/`undefined`
 * for pre-entry screens (E23.2) → every card is non-current.
 */
export function enrichMemberships(
  memberships: TenantMembership[],
  currentTenantId: string | null | undefined,
): TenantCardViewModel[] {
  return memberships.map((m) => ({
    ...m,
    ...resolveTenantDisplay(m.tenantId),
    isCurrent: m.tenantId === currentTenantId,
    isSwitchable: isSwitchable(m),
  }));
}
