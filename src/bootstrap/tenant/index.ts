export {
  evaluateTenantAccess,
  type TenantAccessVerdict,
} from "./access-guard";
export { hasTenantMembership, rolesInTenant } from "./membership";
export {
  type ResolvedTenant,
  resolveTenant,
  TENANT_SEGMENT,
} from "./resolve-tenant";
export {
  type AdminAccessResult,
  type AdminAccessVerdict,
  evaluateAdminAccess,
  evaluateNamespaceAccess,
  type NamespaceAccessResult,
  type NamespaceAccessVerdict,
} from "./role-guard";
export { tenantUrl } from "./tenant-url";
