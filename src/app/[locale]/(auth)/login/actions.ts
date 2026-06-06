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

  const { roles } = result.data.user;
  redirect(roles.length === 1 ? `/${roles[0].role}` : "/select-role");
}

export async function logoutAction(): Promise<void> {
  const useCase = await makeLogoutUseCase();
  await useCase.execute(); // best-effort server revoke
  await clearAuthCookies();
  redirect("/login");
}
