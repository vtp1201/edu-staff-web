import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

export type ForgotActionResult = { errorKey?: AuthFailure["type"] };

export interface ForgotPasswordVM {
  /** POST /auth/password/forgot — email the OTP. */
  onRequest: (email: string) => Promise<ForgotActionResult>;
  /** POST /auth/password/reset — verify OTP + set new password. */
  onReset: (
    email: string,
    otp: string,
    newPassword: string,
  ) => Promise<ForgotActionResult>;
  /** Locale-aware path back to the login screen. */
  loginHref: string;
}
