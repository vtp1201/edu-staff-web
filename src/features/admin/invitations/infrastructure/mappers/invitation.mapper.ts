import type { Invitation as AuthInvitation } from "@/features/auth/domain/entities/invitation.entity";
import type { IamMemberFailure } from "@/features/auth/domain/failures/iam-member.failure";
import type {
  Invitation,
  InvitationRole,
  InvitationStatus,
  InviteRoleOption,
} from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";

const ROLE_VALUES: readonly string[] = [
  "teacher",
  "student",
  "parent",
  "manager",
  "admin",
];

/** Wire/app role string → screen `InvitationRole` (lowercased, 1:1, no alias). */
export function toInvitationRole(role: string): InvitationRole {
  const v = role.toLowerCase();
  // `staff` (a 6th wire value) has no UI badge; unknown values fall back to
  // teacher defensively — never happens with the current 5-option dialog.
  return ROLE_VALUES.includes(v) ? (v as InvitationRole) : "teacher";
}

/**
 * UI role option → wire role. Ground-truth #4: `manager`→"MANAGER",
 * `admin`→"ADMIN" — a straight uppercase, NOT the login-time
 * `MANAGER`/`ADMIN`→`principal` collapse in `role-meta.ts`.
 */
export function toWireRole(role: InviteRoleOption): string {
  return role.toUpperCase();
}

const STATUS_VALUES: readonly string[] = [
  "pending",
  "accepted",
  "expired",
  "revoked",
];

/** Wire status (UPPERCASE on the real wire) → lowercase `InvitationStatus`. */
export function fromWireStatus(status: string): InvitationStatus {
  const v = status.toLowerCase();
  return STATUS_VALUES.includes(v) ? (v as InvitationStatus) : "pending";
}

/** auth-domain (mock) Invitation → admin-invitations screen Invitation. */
export function toInvitation(a: AuthInvitation): Invitation {
  return {
    id: a.invitationId,
    email: a.email,
    role: toInvitationRole(a.roles[0] ?? "teacher"),
    status: fromWireStatus(a.status),
    invitedBy: a.invitedBy,
    sentAt: a.sentAt,
    expiresAt: a.expiresAt,
  };
}

/**
 * Map a thrown `IamMemberFailure` (or unknown) into this feature's failure
 * union. `invitation-invalid` is preserved 1:1 (ground-truth #6);
 * `invitation-expired`/`member-exists` also collapse to `invitation-invalid`
 * (both mean "this invite/member can't be created/acted on as requested").
 */
export function toInvitationFailure(err: unknown): InvitationFailure {
  const type = (err as Partial<IamMemberFailure> | null)?.type;
  switch (type) {
    case "invitation-invalid":
    case "invitation-expired":
    case "member-exists":
      return { type: "invitation-invalid" };
    case "network-error":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}
