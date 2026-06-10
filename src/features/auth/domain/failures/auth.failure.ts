/**
 * Typed auth failures. Repository branches on IAM `error.code` (UPPER_SNAKE,
 * see api-integration rule + ERROR_CODES.md), NOT on `error.message`.
 */
export type AuthFailure =
  | { type: "invalid-credentials" }
  | { type: "account-suspended" }
  | { type: "email-already-exists" }
  | { type: "token-expired" }
  | { type: "invalid-token" }
  | { type: "unauthorized" }
  | { type: "invalid-otp" }
  | { type: "otp-expired" }
  | { type: "too-many-requests" }
  | { type: "network-error" }
  | { type: "unknown"; message: string };
