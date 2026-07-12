"use server";

import {
  makeConfirmEmailVerificationUseCase,
  makeRequestEmailVerificationUseCase,
} from "@/bootstrap/di/auth.di";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

/** Shell-level email-verification actions. Return stable failure KEYS — the
 *  presentation layer translates (i18n.md); no translation happens here. */
export type EmailVerificationActionResult =
  | { ok: true }
  | { errorKey: AuthFailure["type"] };

export async function requestEmailVerificationAction(): Promise<EmailVerificationActionResult> {
  const useCase = await makeRequestEmailVerificationUseCase();
  const result = await useCase.execute();
  if (result.ok) return { ok: true };
  return { errorKey: result.error.type };
}

export async function confirmEmailVerificationAction(
  otp: string,
): Promise<EmailVerificationActionResult> {
  const useCase = await makeConfirmEmailVerificationUseCase();
  const result = await useCase.execute(otp);
  if (result.ok) return { ok: true };
  return { errorKey: result.error.type };
}
