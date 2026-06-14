"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { makeSwitchTenantUseCase } from "@/bootstrap/di/tenant.di";
import {
  clearPendingRolesCookie,
  getPendingRolesCookie,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import { tenantUrl } from "@/bootstrap/tenant";
import { landingPathOf } from "@/features/auth/domain/entities/role-meta";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import { RoleSelectUseCase } from "@/features/auth/domain/use-cases/role-select.use-case";

/**
 * Commit a multi-role user's choice (US-E01.2): verify the chosen BE role enum
 * against the pending_roles cookie, mint a tenant-scoped token for the matching
 * tenant, clear the bridge cookie, then land in the role's workspace.
 */
export async function selectRoleAction(
  roleEnum: string,
  tenantId: string,
): Promise<{ errorKey?: AuthFailure["type"] }> {
  const pending = await getPendingRolesCookie();
  if (!pending) {
    return { errorKey: "unauthorized" };
  }

  const selection = new RoleSelectUseCase().execute(
    roleEnum,
    tenantId,
    pending.roles,
  );
  if (selection.error) {
    return { errorKey: selection.error.type };
  }

  const tokens = await (await makeSwitchTenantUseCase()).execute(tenantId);
  await setAuthCookies(tokens);
  await clearPendingRolesCookie();

  const locale = await getLocale();
  const path = tenantUrl(tenantId, landingPathOf(selection.data.appRole));
  redirect(`/${locale}${path}`);
}

/** Abandon the multi-role flow: clear the bridge cookie and return to login. */
export async function backToLoginAction(): Promise<never> {
  await clearPendingRolesCookie();
  const locale = await getLocale();
  redirect(`/${locale}/login`);
}
