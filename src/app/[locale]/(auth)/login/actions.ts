"use server";
import { redirect } from "next/navigation";
import { makeLoginUseCase, makeLogoutUseCase } from "@/bootstrap/di/auth.di";
import {
  clearAuthCookies,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

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

  await setAuthCookies(result.data);

  // Signin issues a NON-tenant token; the user picks a tenant next, which mints
  // a tenant-scoped token (US-E05.1). Workspace routes live under /t/{tenantId}
  // and the middleware guard redirects here until a tenant is active.
  redirect("/select-tenant");
}

export async function logoutAction(): Promise<void> {
  const useCase = await makeLogoutUseCase();
  await useCase.execute(); // best-effort server revoke
  await clearAuthCookies();
  redirect("/login");
}
