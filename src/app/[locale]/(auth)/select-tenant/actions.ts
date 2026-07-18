"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getLocale } from "next-intl/server";
import { makeSwitchTenantUseCase } from "@/bootstrap/di/tenant.di";
import { redirect } from "@/bootstrap/i18n/routing";
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import { tenantUrl } from "@/bootstrap/tenant";
import type { SwitchTenantResult } from "@/components/shared/tenant-card/tenant-card.i-vm";
import type { TenantFailure } from "@/features/tenant/domain/failures/tenant.failure";
import { resolveTenantDisplay } from "@/features/tenant/infrastructure/mocks/tenant-display.mock";

export type { SwitchTenantResult };

/** Fold the typed TenantFailure into the client-safe stable key. Only 403
 *  stays distinct (inline card error, FR-008); everything else is the generic
 *  retryable toast (FR-009, incl. today's 401 per the AC-9 descope). */
function toErrorKey(failure: TenantFailure): "forbidden" | "network" {
  return failure.type === "forbidden" ? "forbidden" : "network";
}

/**
 * Switch the active tenant (US-E05.1 / US-E23.1): mint a tenant-scoped token via
 * IAM `/members/switch-tenant`, persist it in the httpOnly cookies, then land in
 * the guarded tenant workspace.
 *
 * Path A contract (fe-lead decision 2026-07-18): returns a discriminated
 * `SwitchTenantResult`. The success path `redirect()`s (throws NEXT_REDIRECT)
 * before returning — that throw is propagated UNCHANGED (Risk A: the
 * `isRedirectError` guard re-throws it, it is never converted to `{ ok:false }`).
 * Only `useCase.execute()`'s failure (a typed `TenantFailure` from the repo) is
 * wrapped and mapped to a stable `errorKey` — no raw `ApiError` crosses the
 * Server Action boundary.
 *
 * Success toast (AC-004.4): `redirect()` fires before any client-visible
 * success state, so the target URL carries a one-shot `?switched=1&school=<name>`
 * that `AppShell` reads once on mount, toasts, then strips.
 */
export async function switchTenantAction(
  tenantId: string,
  role: string,
): Promise<SwitchTenantResult> {
  const useCase = await makeSwitchTenantUseCase();
  try {
    const tokens = await useCase.execute(tenantId);
    await setAuthCookies(tokens);

    const locale = await getLocale();
    const { tenantName } = resolveTenantDisplay(tenantId);
    const base = tenantUrl(tenantId, role ? `/${role}` : "/");
    const href = `${base}?switched=1&school=${encodeURIComponent(tenantName)}`;
    // Land in the chosen tenant's workspace; throws NEXT_REDIRECT (control flow).
    redirect({ href, locale });
    return { ok: true };
  } catch (err) {
    // Risk A: the redirect throw is NOT an application error — propagate it.
    if (isRedirectError(err)) throw err;
    return { ok: false, errorKey: toErrorKey(err as TenantFailure) };
  }
}
