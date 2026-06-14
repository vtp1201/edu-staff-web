import type { UserRole, UserTenantRole } from "../entities/auth-user.entity";
import { appRoleOf } from "../entities/role-meta";
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
 * Resolve a chosen BE role enum to the matching tenant role the user actually
 * holds. Pure — no side effects; the action layer persists the choice.
 */
export class RoleSelectUseCase {
  execute(roleEnum: string, roles: UserTenantRole[]): RoleSelectResult {
    const appRole = appRoleOf(roleEnum);
    if (!appRole) return { error: { type: "unauthorized" } };

    const match = roles.find((r) => r.role === appRole);
    if (!match) return { error: { type: "unauthorized" } };

    return {
      data: {
        appRole,
        tenantId: match.tenantId,
        tenantName: match.tenantName,
        tenantCode: match.tenantCode,
      },
    };
  }
}
