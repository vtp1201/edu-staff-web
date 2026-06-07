/**
 * Tenant-scope access guard (US-E05.1, hard gate Authorization). The BE mints a
 * TENANT-SCOPED token on `POST /members/switch-tenant` carrying a `tenantId`
 * claim and rejects non-members (403). So the cheap, round-trip-free guard is:
 * the URL's tenant must equal the active token's `tenantId` claim. BE still
 * enforces membership on every API call (defense in depth).
 *
 * Pure + testable; the middleware/layout reads the claim and acts on the verdict.
 */
export type TenantAccessVerdict =
  | "allowed"
  | "no-active-tenant" // logged in but no tenant-scoped token yet → pick a tenant
  | "tenant-mismatch"; // token is scoped to a different tenant → switch/deny

export function evaluateTenantAccess(
  urlTenantId: string,
  tokenTenantId: string | null | undefined,
): TenantAccessVerdict {
  if (!tokenTenantId) return "no-active-tenant";
  if (tokenTenantId !== urlTenantId) return "tenant-mismatch";
  return "allowed";
}
