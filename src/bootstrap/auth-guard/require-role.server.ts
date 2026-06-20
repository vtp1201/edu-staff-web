import "server-only";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { type AccessVerdict, evaluateAccess } from "./access-context";

export type GuardResult =
  | { ok: true; role: UserRole }
  | { ok: false; reason: AccessVerdict };

/**
 * Server-Action role guard (decision 0022/0024).
 * Scoped to ROLE only — tenant is enforced at the layout level (RSC).
 * Server Actions have no URL tenant param; the layout already gated the page render.
 * Reads the httpOnly auth_token cookie → decodes role → evaluates.
 *
 * Mock-first (ADR 0014/0024): when NEXT_PUBLIC_USE_MOCK=true, decodeRoleClaim
 * returns "admin" for any non-empty token — guard passes in mock mode.
 */
export async function requireRole(
  requiredRoles?: readonly UserRole[],
): Promise<GuardResult> {
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");

  // Use a dummy tenantId for the role-only check — tenant enforcement stays in layout.
  const ROLE_ONLY_TENANT = "__role_check__";
  const verdict = evaluateAccess({
    role,
    tokenTenantId: ROLE_ONLY_TENANT,
    urlTenantId: ROLE_ONLY_TENANT,
    requiredRoles,
  });

  if (verdict === "allowed") {
    return { ok: true, role: role as UserRole };
  }

  // Map unauthenticated → same "not ok" shape (actions can only return errorKey)
  return {
    ok: false,
    reason: verdict === "unauthenticated" ? "unauthenticated" : verdict,
  };
}
