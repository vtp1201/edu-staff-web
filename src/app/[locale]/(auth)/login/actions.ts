"use server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  makeLoginUseCase,
  makeLogoutUseCase,
  makeSocialAuthUseCase,
} from "@/bootstrap/di/auth.di";
import {
  clearAuthCookies,
  setAuthCookies,
  setPendingRolesCookie,
} from "@/bootstrap/lib/auth-token.server";
import type { AuthSession } from "@/features/auth/domain/entities/auth-user.entity";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

/**
 * After authentication, route by role count:
 *  - ≥2 roles → stash the choices and go to the multi-role select step;
 *  - exactly 1 role → the existing single-step tenant select.
 * Throws the framework redirect — callers must not catch it.
 */
async function routeAfterAuth(session: AuthSession): Promise<never> {
  await setAuthCookies(session);
  const locale = await getLocale();

  if (session.user.roles.length >= 2) {
    await setPendingRolesCookie(session.user);
    redirect(`/${locale}/select-role`);
  }

  // Signin issues a NON-tenant token; the user picks a tenant next, which mints
  // a tenant-scoped token (US-E05.1). Workspace routes live under /t/{tenantId}.
  redirect(`/${locale}/select-tenant`);
}

/**
 * Returns a stable i18n KEY (the failure type), not a translated string —
 * translation happens at the presentation layer (decision `0020`). The key
 * maps 1:1 to `auth.errors.<type>` in messages.
 */
export async function loginAction(
  email: string,
  password: string,
): Promise<{ errorKey?: AuthFailure["type"] }> {
  const useCase = await makeLoginUseCase();
  const result = await useCase.execute(email, password);

  if (result.error) {
    return { errorKey: result.error.type };
  }

  return routeAfterAuth(result.data);
}

/**
 * SSO sign-in (US-E01.2 / ADR 0035). `google` is fully wired; `vneid` is gated
 * off in the UI for now. Exchanges the provider token at IAM, then routes the
 * same way email login does.
 */
export async function socialSigninAction(
  provider: "google" | "vneid",
  token: string,
): Promise<{ errorKey?: AuthFailure["type"] }> {
  const useCase = await makeSocialAuthUseCase();
  const result = await useCase.execute(provider, token);

  if (result.error) {
    return { errorKey: result.error.type };
  }

  return routeAfterAuth(result.data);
}

export async function logoutAction(): Promise<void> {
  const useCase = await makeLogoutUseCase();
  await useCase.execute(); // best-effort server revoke
  await clearAuthCookies();
  redirect("/login");
}
