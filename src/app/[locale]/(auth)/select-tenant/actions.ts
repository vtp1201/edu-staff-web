"use server";

import { getLocale } from "next-intl/server";
import { makeSwitchTenantUseCase } from "@/bootstrap/di/tenant.di";
import { redirect } from "@/bootstrap/i18n/routing";
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import { tenantUrl } from "@/bootstrap/tenant";

/**
 * Switch the active tenant (US-E05.1): mint a tenant-scoped token via IAM
 * `/members/switch-tenant`, persist it in the httpOnly cookies, then land in
 * the guarded tenant workspace. BE rejects non-members with 403.
 */
export async function switchTenantAction(tenantId: string): Promise<void> {
  const useCase = await makeSwitchTenantUseCase();
  const tokens = await useCase.execute(tenantId);
  await setAuthCookies(tokens);

  const locale = await getLocale();
  redirect({ href: tenantUrl(tenantId), locale });
}
