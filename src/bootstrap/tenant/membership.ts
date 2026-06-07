import type { UserTenantRole } from "@/features/auth/domain/entities/auth-user.entity";

/**
 * Tenant-scope authorization predicate (US-E05.1, hard gate Authorization).
 * A user may enter a tenant only if they hold a role in it. Pure + testable;
 * the ENFORCEMENT (fetching roles + mapping URL slug→tenantId) is deferred
 * until BE IAM exposes memberships — see decision.
 */
export function hasTenantMembership(
  roles: UserTenantRole[],
  tenantId: string,
): boolean {
  return roles.some((r) => r.tenantId === tenantId);
}

/** Roles the user holds within a given tenant (for role-selection UI later). */
export function rolesInTenant(
  roles: UserTenantRole[],
  tenantId: string,
): UserTenantRole[] {
  return roles.filter((r) => r.tenantId === tenantId);
}
