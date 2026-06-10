import "server-only";

import {
  getRefreshToken,
  isCurrentAccessExpired,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { LoginUseCase } from "@/features/auth/domain/use-cases/login.use-case";
import { LogoutUseCase } from "@/features/auth/domain/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "@/features/auth/domain/use-cases/refresh-session.use-case";
import { RequestPasswordResetUseCase } from "@/features/auth/domain/use-cases/request-password-reset.use-case";
import { ResetPasswordUseCase } from "@/features/auth/domain/use-cases/reset-password.use-case";
import { AuthRepository } from "@/features/auth/infrastructure/repositories/auth.repository";

export async function makeLoginUseCase() {
  const http = await createServerHttpClient();
  return new LoginUseCase(new AuthRepository(http));
}

export async function makeRequestPasswordResetUseCase() {
  const http = await createServerHttpClient();
  return new RequestPasswordResetUseCase(new AuthRepository(http));
}

export async function makeResetPasswordUseCase() {
  const http = await createServerHttpClient();
  return new ResetPasswordUseCase(new AuthRepository(http));
}

export async function makeRefreshSessionUseCase() {
  const http = await createServerHttpClient();
  return new RefreshSessionUseCase(new AuthRepository(http));
}

export async function makeLogoutUseCase() {
  const http = await createServerHttpClient();
  return new LogoutUseCase(new AuthRepository(http));
}

/**
 * Proactive refresh (decision `0018`): if the access token is about to expire,
 * rotate it server-side BEFORE issuing protected calls, avoiding a wasted 401.
 * Protected feature DI factories should `await ensureFreshSession()` first.
 * No-op when there is no refresh token or the access token is still valid.
 */
export async function ensureFreshSession(): Promise<void> {
  if (!(await isCurrentAccessExpired())) return;
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return;

  const useCase = await makeRefreshSessionUseCase();
  const result = await useCase.execute(refreshToken);
  if (result.data) await setAuthCookies(result.data);
}
