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
};

export function mapAuthError(err: unknown): AuthFailure {
  const code = errorCodeOf(err);
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  if (statusOf(err) === undefined) return { type: "network-error" };
  return { type: "unknown", message: code ?? String(err) };
}
