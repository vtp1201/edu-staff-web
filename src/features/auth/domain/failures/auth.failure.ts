export type AuthFailure =
  | { type: "invalid-credentials" }
  | { type: "account-suspended" }
  | { type: "network-error" }
  | { type: "unknown"; message: string };
