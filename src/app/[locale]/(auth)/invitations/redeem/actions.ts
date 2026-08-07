"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { makeRedeemInvitationUseCase } from "@/bootstrap/di/invitation-redeem.di";
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import { tenantUrl } from "@/bootstrap/tenant";
import { appRoleOf } from "@/features/auth/domain/entities/role-meta";
import type { RedeemInvitationActionResult } from "@/features/auth/presentation/invite-redeem/invite-redeem.i-vm";

/**
 * Redeem an invitation as a NEW user (US-E18.53, IAM US-191 / ADR 0130/0131):
 * create the account, join the tenant, and land inside the workspace with NO
 * separate sign-in step — BE returns a tenant-scoped session directly, so
 * unlike `joinAction` there is no `switchTenant` round-trip here.
 *
 * SECURITY (mirrors `joinAction`'s discipline exactly, do not relax):
 *  - the request carries NO email — the account's address is the invitation's,
 *    resolved server-side (ADR 0131 D5);
 *  - the redirect target is built ONLY from the SERVER's response
 *    (`member.tenantId` + `member.roles[0]`); nothing the caller submitted can
 *    influence it, and there is no "next"/"returnTo" parameter to validate
 *    because none is accepted;
 *  - cookies are written from the response's own tokens through the SHARED
 *    `setAuthCookies` helper (httpOnly, server-only) — never a parallel path —
 *    and only after a successful redemption.
 *
 * On failure it returns a stable KEY (plus per-field issue keys for
 * `invalid-input`); the screen translates. `redirect()` is typed `never`, so
 * the two shapes coexist the way `joinAction`/`loginAction` already do.
 */
export async function redeemAction(
  token: string,
  password: string,
  fullName: string,
): Promise<RedeemInvitationActionResult> {
  const useCase = await makeRedeemInvitationUseCase();
  const result = await useCase.execute({ token, password, fullName });

  if (result.error) {
    return result.error.type === "invalid-input"
      ? { errorKey: result.error.type, issues: result.error.issues }
      : { errorKey: result.error.type };
  }

  const { member, tokens } = result.data;
  await setAuthCookies(tokens);

  const locale = await getLocale();
  // Membership roles are BE wire enums ("TEACHER"); routes are appRoles
  // ("/teacher"), and several enums collapse (ADMIN/MANAGER → principal).
  // Same normalisation as `switchTenantAction`, including its lowercase
  // fallback so a future BE role never hard-crashes the landing.
  const roleEnum = member.roles[0] ?? "";
  const appRole = appRoleOf(roleEnum) ?? roleEnum.toLowerCase();
  redirect(
    `/${locale}${tenantUrl(member.tenantId, appRole ? `/${appRole}` : "/")}`,
  );
}
