import "server-only";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import { getAccessToken } from "./auth-token.server";
import { decodeRoleClaim } from "./jwt";

/**
 * Resolve the authenticated session's role from the httpOnly access-token claim
 * (server-only — the client cannot read the token). This is the exact two-line
 * sequence already used inside `makeParentLinksAuthContext()` (US-E20.1),
 * extracted so any role-gated RSC page (e.g. Profile's parent-consent gate,
 * US-E20.2) shares one seam instead of copy-pasting the decode. Pure DRY, no
 * behavior change, no ADR.
 *
 * In mock mode `decodeRoleClaim` returns "admin" for any non-empty token
 * (decision 0014/0024). Returns `null` when there is no readable token.
 */
export async function getSessionRole(): Promise<UserRole | null> {
  const token = (await getAccessToken()) ?? "";
  return decodeRoleClaim(token);
}
