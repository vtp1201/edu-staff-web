"use server";

import {
  makeRequestPasswordResetUseCase,
  makeResetPasswordUseCase,
} from "@/bootstrap/di/auth.di";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

/** Returns a stable i18n error KEY (failure type); presentation translates it. */
export async function forgotPasswordAction(
  email: string,
): Promise<{ errorKey?: AuthFailure["type"] }> {
  const result = await (await makeRequestPasswordResetUseCase()).execute(email);
  return result.error ? { errorKey: result.error.type } : {};
}

export async function resetPasswordAction(
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ errorKey?: AuthFailure["type"] }> {
  const result = await (await makeResetPasswordUseCase()).execute(
    email,
    otp,
    newPassword,
  );
  return result.error ? { errorKey: result.error.type } : {};
}
