import type { UserRole } from "./auth-user.entity";

/**
 * IAM role enum (BE wire value on `UserTenantRole.role`) → app role.
 * Multiple BE enums collapse onto a single appRole (MANAGER+ADMIN → principal,
 * STAFF → teacher). Pure mapping — no React/presentation concerns here.
 */
export const ROLE_ENUM_TO_APP: Record<string, UserRole> = {
  TEACHER: "teacher",
  ADMIN: "principal",
  MANAGER: "principal",
  STAFF: "teacher",
  STUDENT: "student",
  PARENT: "parent",
};

/** Resolve a BE role enum to its appRole, or null when unknown. */
export function appRoleOf(roleEnum: string): UserRole | null {
  return ROLE_ENUM_TO_APP[roleEnum] ?? null;
}

/**
 * Landing path (within a tenant workspace) for an appRole after auth. Tenant
 * prefix is added by `tenantUrl`; locale prefix by next-intl routing.
 */
const APP_ROLE_LANDING: Record<UserRole, string> = {
  teacher: "/dashboard",
  principal: "/dashboard",
  student: "/home",
  parent: "/children",
  admin: "/dashboard",
};

export function landingPathOf(appRole: UserRole): string {
  return APP_ROLE_LANDING[appRole];
}
