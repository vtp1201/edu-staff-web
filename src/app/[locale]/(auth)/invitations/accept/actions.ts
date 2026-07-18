"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  makeAcceptInvitationUseCase,
  makeLogoutUseCase,
} from "@/bootstrap/di/auth.di";
import { makeSwitchTenantUseCase } from "@/bootstrap/di/tenant.di";
import {
  clearAuthCookies,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import { tenantUrl } from "@/bootstrap/tenant";
import type { IamMemberFailure } from "@/features/auth/domain/failures/iam-member.failure";

/**
 * Accept the invitation for the already-authenticated caller (US-E21.2, ADR
 * 0059). The accept payload is EXACTLY `{token}` — role/tenantId/email are
 * resolved server-side from the invitation + JWT (never client-supplied). On
 * success, mints a tenant-scoped session for the SERVER-RETURNED `tenantId`
 * (never a client value) via the existing `switchTenant` path and redirects —
 * no intermediate success screen (matches `switchTenantAction`). Returns a
 * stable failure KEY on error; the presentation layer translates it.
 */
export async function joinAction(
  token: string,
): Promise<{ errorKey?: IamMemberFailure["type"] }> {
  const useCase = await makeAcceptInvitationUseCase();
  const result = await useCase.execute(token);
  if (result.error) return { errorKey: result.error.type };

  const switchUseCase = await makeSwitchTenantUseCase();
  const tokens = await switchUseCase.execute(result.data.tenantId);
  await setAuthCookies(tokens);

  const locale = await getLocale();
  const role = result.data.roles[0] ?? "";
  // `next/navigation` redirect (typed `never`) so this action can also return an
  // error-key object on the failure path — matches `loginAction`'s own shape.
  // `tenantUrl` is locale-relative, so prefix the locale like `loginAction` does.
  redirect(
    `/${locale}${tenantUrl(result.data.tenantId, role ? `/${role}` : "/")}`,
  );
}

/**
 * Sign out and re-land on the SAME `?token=` URL (UC-107) so the visitor can
 * sign in as the invited account. Reuses the shared logout primitives
 * (`makeLogoutUseCase` + `clearAuthCookies`) but redirects back HERE rather
 * than to `/login` (which would drop the token) — so it is invitation-accept's
 * own action, not a fork of `login/actions.ts`'s `logoutAction`. On logout
 * failure the session is NOT cleared and a stable key is returned (AC-107.2).
 */
export async function switchAccountAction(
  token: string,
): Promise<{ errorKey?: string }> {
  const useCase = await makeLogoutUseCase();
  try {
    await useCase.execute();
  } catch {
    return { errorKey: "logout-failed" };
  }
  await clearAuthCookies();

  const locale = await getLocale();
  // Re-land on the SAME token URL (UC-107) so the visitor can sign in as the
  // invited account without losing the invitation.
  redirect(`/${locale}/invitations/accept?token=${encodeURIComponent(token)}`);
}
