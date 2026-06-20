import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { evaluateTenantAccess } from "@/bootstrap/tenant/access-guard";

/**
 * Resolves the tenant for the SSE stream after verifying it against the token claim.
 * Mock-first (ADR 0014/0024): useMock=true skips the claim check (mock tokens
 * carry no real tenantId).
 *
 * @param token - the decoded access token string
 * @param requested - the ?tenant= query param value (or cookie fallback)
 * @param useMock - bypass claim check in mock mode
 */
export function resolveStreamTenant(
  token: string,
  requested: string,
  useMock: boolean,
): { ok: true; tenantId: string } | { ok: false } {
  if (useMock) return { ok: true, tenantId: requested };
  const verdict = evaluateTenantAccess(requested, decodeTenantId(token));
  if (verdict !== "allowed") return { ok: false };
  return { ok: true, tenantId: requested };
}
