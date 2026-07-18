/**
 * Screen-facing invitation domain types (US-E21.1).
 *
 * `InvitationRole` is this feature's OWN small role vocabulary — the UI's 5
 * radio options lowercased, 1:1 with the wire values on send (ground-truth #4:
 * `teacher|student|parent|manager|admin` → `TEACHER|STUDENT|PARENT|MANAGER|ADMIN`).
 * `manager` is kept as a DISTINCT value here (a real wire role), NOT collapsed
 * to `principal` — deliberately different from the unrelated login-time
 * `ROLE_ENUM_TO_APP` mapping in `role-meta.ts` (decision 0036). Do NOT import
 * `UserRole`/`appRoleOf` here.
 */
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type InvitationRole =
  | "teacher"
  | "student"
  | "parent"
  | "manager"
  | "admin";

/** UI-facing role choice in the send dialog — same value set as InvitationRole. */
export type InviteRoleOption = InvitationRole;

export interface Invitation {
  id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedBy: string;
  /** ISO timestamp. */
  sentAt: string;
  /** ISO timestamp. */
  expiresAt: string;
}

export type ExpiryDays = 7 | 14 | 30;

export interface SendInvitationBatchInput {
  emails: string[];
  role: InviteRoleOption;
  /**
   * UI-only (ground-truth #2): the real wire has NO `expiryDays` field — the
   * invitation TTL is server-computed. Kept per AC-003.6/003.7 + design-spec;
   * the mock model may honour it locally for a freshly-sent row's countdown,
   * but it is never sent on a real request.
   */
  expiryDays: ExpiryDays;
}
