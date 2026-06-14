import type { UserRole, UserTenantRole } from "../entities/auth-user.entity";
import type { AuthFailure } from "../failures/auth.failure";

export interface RoleSelection {
  appRole: UserRole;
  tenantId: string;
  tenantName: string;
  tenantCode: string | undefined;
}

export type RoleSelectResult =
  | { data: RoleSelection; error?: never }
  | { data?: never; error: AuthFailure };

/**
 * Resolve a chosen (BE role enum + tenant) pair to the exact tenant role the
 * user actually holds. Matching on `roleEnum` AND `tenantId` keeps two enums
 * that collapse to the same appRole — and the same appRole across two tenants —
 * distinguishable (ADR 0036). Pure — no side effects; the action layer persists.
 */
export class RoleSelectUseCase {
  execute(
    roleEnum: string,
    tenantId: string,
    roles: UserTenantRole[],
  ): RoleSelectResult {
    const match = roles.find(
      (r) => r.roleEnum === roleEnum && r.tenantId === tenantId,
    );
    if (!match) return { error: { type: "unauthorized" } };

    return {
      data: {
        appRole: match.role,
        tenantId: match.tenantId,
        tenantName: match.tenantName,
        tenantCode: match.tenantCode,
      },
    };
  }
}
