import "server-only";

import {
  getRefreshToken,
  isCurrentAccessExpired,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { AcceptInvitationUseCase } from "@/features/auth/domain/use-cases/accept-invitation.use-case";
import { ConfirmEmailVerificationUseCase } from "@/features/auth/domain/use-cases/confirm-email-verification.use-case";
import { GetProfileUseCase } from "@/features/auth/domain/use-cases/get-profile.use-case";
import { LoginUseCase } from "@/features/auth/domain/use-cases/login.use-case";
import { LogoutUseCase } from "@/features/auth/domain/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "@/features/auth/domain/use-cases/refresh-session.use-case";
import { RequestEmailVerificationUseCase } from "@/features/auth/domain/use-cases/request-email-verification.use-case";
import { RequestPasswordResetUseCase } from "@/features/auth/domain/use-cases/request-password-reset.use-case";
import { ResetPasswordUseCase } from "@/features/auth/domain/use-cases/reset-password.use-case";
import { SocialAuthUseCase } from "@/features/auth/domain/use-cases/social-auth.use-case";
import { AuthRepository } from "@/features/auth/infrastructure/repositories/auth.repository";
import { IamMemberRepository } from "@/features/auth/infrastructure/repositories/iam-member.repository";
import { MockIamMemberRepository } from "@/features/auth/infrastructure/repositories/mocks/iam-member.mock.repository";

export async function makeLoginUseCase() {
  const http = await createServerHttpClient();
  return new LoginUseCase(new AuthRepository(http));
}

export async function makeSocialAuthUseCase() {
  const http = await createServerHttpClient();
  return new SocialAuthUseCase(new AuthRepository(http));
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
 * Protected `GET /users/me` outside the login flow — proactively refresh the
 * access token first (decision 0018) so the fetch never wastes a 401 round-trip.
 */
export async function makeGetProfileUseCase() {
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new GetProfileUseCase(new AuthRepository(http));
}

/**
 * `POST /invitations/accept` (US-E21.2). Proactively refresh first (decision
 * 0018): the accept route is `RequireAuth`-gated and the page's auth-gate check
 * only verifies token PRESENCE, not freshness — refreshing here avoids a wasted
 * 401 on this high-risk call (matches `makeGetProfileUseCase`'s own precedent).
 *
 * `USE_MOCK`-gated like every other `IIamMemberRepository` consumer
 * (`iam-member.di.ts`'s `makeRepo`, `admin-invitations.di.ts`) — QA flagged
 * this factory as the one outlier that always constructed the real repo
 * regardless of the flag; fixed to match the established convention.
 */
export async function makeAcceptInvitationUseCase() {
  if (USE_MOCK) {
    return new AcceptInvitationUseCase(new MockIamMemberRepository());
  }
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new AcceptInvitationUseCase(new IamMemberRepository(http));
}

export async function makeRequestEmailVerificationUseCase() {
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new RequestEmailVerificationUseCase(new AuthRepository(http));
}

export async function makeConfirmEmailVerificationUseCase() {
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new ConfirmEmailVerificationUseCase(new AuthRepository(http));
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
