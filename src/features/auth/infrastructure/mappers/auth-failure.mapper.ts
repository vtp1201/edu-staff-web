import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AuthFailure } from "../../domain/failures/auth.failure";

/** IAM `error.code` → typed `AuthFailure` (branch on code, NOT message). */
const CODE_MAP: Record<string, AuthFailure> = {
  USER_INVALID_CREDENTIALS: { type: "invalid-credentials" },
  USER_SUSPENDED: { type: "account-suspended" },
  ACCOUNT_SUSPENDED: { type: "account-suspended" },
  USER_EMAIL_ALREADY_EXISTS: { type: "email-already-exists" },
  TOKEN_EXPIRED: { type: "token-expired" },
  INVALID_TOKEN: { type: "invalid-token" },
  UNAUTHORIZED_ACCESS: { type: "unauthorized" },
  // OTP / rate-limit (US-030; BE emits lowercase per ERROR_CODES.md — map both).
  USER_INVALID_OTP: { type: "invalid-otp" },
  user_invalid_otp: { type: "invalid-otp" },
  USER_OTP_EXPIRED: { type: "otp-expired" },
  user_otp_expired: { type: "otp-expired" },
  USER_TOO_MANY_ATTEMPTS: { type: "too-many-requests" },
  user_too_many_attempts: { type: "too-many-requests" },
  RATE_LIMIT_EXCEEDED: { type: "too-many-requests" },
  rate_limit_exceeded: { type: "too-many-requests" },
};

export function mapAuthError(err: unknown): AuthFailure {
  const code = errorCodeOf(err);
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  // 429 without a recognised code → still a rate-limit signal.
  if (statusOf(err) === 429) return { type: "too-many-requests" };
  if (statusOf(err) === undefined) return { type: "network-error" };
  return { type: "unknown", message: code ?? String(err) };
}
