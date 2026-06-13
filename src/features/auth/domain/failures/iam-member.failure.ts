/** Typed failure union for IAM member/invitation flows (US-E06.4). */
export type IamMemberFailure =
  | { type: "forbidden" }
  | { type: "not-found" }
  | { type: "email-exists" }
  | { type: "invitation-not-found" }
  | { type: "last-admin" }
  | { type: "network-error" }
  | { type: "unknown" };
