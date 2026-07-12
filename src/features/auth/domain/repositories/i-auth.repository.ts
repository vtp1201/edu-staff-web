import type {
  AuthSession,
  AuthTokens,
  AuthUser,
} from "../entities/auth-user.entity";
import type { AuthFailure } from "../failures/auth.failure";

export type AuthResult =
  | { data: AuthSession; error?: never }
  | { data?: never; error: AuthFailure };

/** Standalone `GET /users/me` result — identity only, no tokens (unlike AuthResult). */
export type ProfileResult =
  | { data: AuthUser; error?: never }
  | { data?: never; error: AuthFailure };

export type RefreshResult =
  | { data: AuthTokens; error?: never }
  | { data?: never; error: AuthFailure };

/** Body-less operation result (forgot/reset password). */
export type VoidResult =
  | { ok: true; error?: never }
  | { ok?: never; error: AuthFailure };

export interface IAuthRepository {
  /** `POST /auth/signin` then `GET /users/me` → full session. */
  signin(email: string, password: string): Promise<AuthResult>;
  /** `POST /auth/social` (provider token) then `GET /users/me` → full session. */
  socialSignin(
    provider: "google" | "vneid",
    token: string,
  ): Promise<AuthResult>;
  /** `POST /auth/refresh` with refresh token → rotated token pair. */
  refresh(refreshToken: string): Promise<RefreshResult>;
  /** `POST /auth/signout` — server revokes session from bearer token. */
  signout(): Promise<void>;
  /** `POST /auth/password/forgot` — email a reset OTP (enumeration-safe 200). */
  requestPasswordReset(email: string): Promise<VoidResult>;
  /** `POST /auth/password/reset` — verify OTP + set new password (revokes sessions). */
  resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<VoidResult>;
  /** Standalone `GET /users/me` (no signin flow attached, no tokens). */
  getProfile(): Promise<ProfileResult>;
  /** `POST /users/me/email/verification` — send/resend the verification email (204). */
  requestEmailVerification(): Promise<VoidResult>;
  /** `POST /users/me/email/verification/confirm` — submit the 6-digit OTP (204). */
  confirmEmailVerification(otp: string): Promise<VoidResult>;
}
