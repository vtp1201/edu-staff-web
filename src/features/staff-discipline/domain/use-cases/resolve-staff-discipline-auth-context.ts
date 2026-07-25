import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";

export interface ResolveStaffDisciplineAuthContextInput {
  /** `decodeRoleClaim(token)` — null when unreadable/absent. */
  claimRole: UserRole | null;
  /** `decodeSubClaim(token)` — the caller's member id, null when unreadable. */
  claimMemberId: string | null;
  /** `NEXT_PUBLIC_USE_MOCK` — mock tokens carry a synthetic role claim. */
  useMock: boolean;
  /**
   * Route-scoped role used ONLY in mock mode, where `decodeRoleClaim` returns a
   * synthetic "admin" for any token (jwt.ts) and would otherwise deny every
   * principal mutation in local dev. IGNORED entirely when `useMock` is false —
   * it is a dev affordance, never an authorization input.
   */
  mockRoleHint: UserRole;
  mockMemberId: string;
  mockStaffMemberId: string;
}

/**
 * Pure resolver for the server-derived `StaffDisciplineAuthContext` (NFR-008).
 *
 * Deny-by-default: an unreadable/absent role claim resolves to a NON-`principal`
 * role, so a broken token can never mutate. In real mode the token claim ALWAYS
 * wins over the mock hint.
 */
export function resolveStaffDisciplineAuthContext(
  input: ResolveStaffDisciplineAuthContextInput,
): StaffDisciplineAuthContext {
  if (input.useMock) {
    return {
      role: input.mockRoleHint,
      memberId: input.mockMemberId,
      staffMemberId: input.mockStaffMemberId,
    };
  }
  return {
    // Unknown role ⇒ deny-by-default (never `principal`).
    role: input.claimRole ?? "student",
    memberId: input.claimMemberId ?? "",
    // Real staff-member-id resolution is blocked by the roster-UUID gap
    // (spec §8); the caller's member id is the closest real self-scope key.
    staffMemberId: input.claimMemberId ?? "",
  };
}
