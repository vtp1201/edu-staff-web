"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { tenantUrl } from "@/bootstrap/tenant";
import type { AuthTokens } from "@/features/auth/domain/entities/auth-user.entity";
import type { Member } from "@/features/auth/domain/entities/member.entity";
import { appRoleOf } from "@/features/auth/domain/entities/role-meta";

/**
 * Finish a redemption the BROWSER already performed (US-E18.59, ADR 0072).
 *
 * `POST /invitations/redeem` is per-IP rate limited at IAM, so since ADR 0072 it
 * is issued directly from the client; routing it through this server made Kong
 * see ONE IP for every visitor, letting a single abusive invitee 429-lock the
 * whole invitee population out of account creation.
 *
 * What cannot move to the client is the session write: `setAuthCookies` needs
 * `next/headers`. So this action is deliberately NARROW — persist the tokens the
 * BE already issued, then redirect. It must NEVER call IAM again (that would
 * silently restore the shared-IP defect); `actions.test.ts` asserts exactly
 * that, both at runtime and by reading this file's imports.
 *
 * SECURITY — the trust boundary moved, so read this before editing:
 *  - `member`/`tokens` now arrive FROM THE CLIENT (it holds the redeem
 *    response). Next's Server-Action origin check is what stops a cross-site
 *    caller; nothing here can re-verify the pair against IAM without
 *    reintroducing the very call the story removed.
 *  - The landing route is therefore built defensively: the tenant segment
 *    prefers the ACCESS TOKEN's own `tenantId` claim, so an incoherent payload
 *    can only ever land the visitor in the workspace their session actually
 *    authorizes, and it is always assembled through `tenantUrl` — there is no
 *    "next"/"returnTo" parameter accepted, so there is nothing to validate.
 *  - Cookies are written through the SHARED helper (httpOnly, decision `0018`),
 *    never a parallel path.
 */
export async function finalizeRedeemAction(
  member: Member,
  tokens: AuthTokens,
): Promise<void> {
  await setAuthCookies(tokens);

  const locale = await getLocale();
  // Membership roles are BE wire enums ("TEACHER"); routes are appRoles
  // ("/teacher"), and several enums collapse (ADMIN/MANAGER → principal).
  // Same normalisation as `switchTenantAction`, including its lowercase
  // fallback so a future BE role never hard-crashes the landing.
  const roleEnum = member.roles[0] ?? "";
  const appRole = appRoleOf(roleEnum) ?? roleEnum.toLowerCase();
  const tenantId = decodeTenantId(tokens.accessToken) ?? member.tenantId;
  redirect(`/${locale}${tenantUrl(tenantId, appRole ? `/${appRole}` : "/")}`);
}
