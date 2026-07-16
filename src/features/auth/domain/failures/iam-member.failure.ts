/**
 * Typed failure union for IAM member/invitation flows (US-E06.4, corrected
 * against the real wire taxonomy in US-E18.6 — IAM's `error.code` is always
 * the lowercase snake_case i18n key, see
 * `services/iam/internal/membership/core/domain/error/member.go` /
 * `.../tenant/core/domain/error/tenant.go` in edu-api).
 */
export type IamMemberFailure =
  | { type: "forbidden" } // wire: forbidden_action
  | { type: "not-found" } // wire: member_not_found
  | { type: "member-exists" } // wire: member_already_exists (renamed from email-exists — the real conflict is a duplicate userId membership, not an email collision)
  | { type: "tenant-inactive" } // wire: member_tenant_inactive
  | { type: "invalid-transition" } // wire: member_invalid_transition
  | { type: "invitation-invalid" } // wire: invitation_invalid (410 — renamed from invitation-not-found)
  | { type: "invitation-expired" } // wire: invitation_expired (410)
  | { type: "invitation-email-mismatch" } // wire: invitation_email_mismatch (403, F8)
  | { type: "last-admin" } // wire: member_last_admin
  | { type: "network-error" }
  | { type: "unknown" };
