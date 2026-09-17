export {
  evaluateTenantAccess,
  type TenantAccessVerdict,
} from "./access-guard";
export { DEFAULT_ROUTE } from "./default-route";
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
export { academicRecordHref, tenantUrl } from "./tenant-url";
