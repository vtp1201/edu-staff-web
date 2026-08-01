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

/**
 * auth-domain Invitation → admin-invitations screen Invitation.
 *
 * The shared entity's wire-named `createdAt` becomes this screen's own `sentAt`
 * concept (the column is labelled "Ngày gửi"). `invitedBy` stays the RAW userId
 * here — {@link applyInvitedByNames} substitutes display names once the batch
 * lookup resolves, inside the repository.
 */
export function toInvitation(a: AuthInvitation): Invitation {
  return {
    id: a.invitationId,
    email: a.email,
    role: toInvitationRole(a.roles[0] ?? "teacher"),
    status: fromWireStatus(a.status),
    invitedBy: a.invitedBy,
    sentAt: a.createdAt,
    expiresAt: a.expiresAt,
  };
}

/**
 * Substitute each row's raw `invitedBy` userId with its resolved display name
 * (AC-3). An id the batch lookup omitted (unknown/other-tenant id, or a lookup
 * that failed entirely) becomes an EMPTY STRING — never the raw UUID; the screen
 * renders its own i18n fallback copy for an empty value, keeping translation at
 * the presentation boundary.
 */
export function applyInvitedByNames(
  rows: Invitation[],
  resolved: Map<string, string>,
): Invitation[] {
  return rows.map((row) => ({
    ...row,
    invitedBy: resolved.get(row.invitedBy) ?? "",
  }));
}

/**
 * Map a thrown `IamMemberFailure` (or unknown) into this feature's failure
 * union. `invitation-invalid` is preserved 1:1 (ground-truth #6);
 * `invitation-expired`/`member-exists` also collapse to `invitation-invalid`
 * (both mean "this invite/member can't be created/acted on as requested").
 * The three US-E18.29 wire failures pass through 1:1 — each needs its own UI
 * treatment (409 reconciles the list, 429 must NOT refetch, 400 is defensive).
 */
export function toInvitationFailure(err: unknown): InvitationFailure {
  const failure = err as Partial<IamMemberFailure> | null;
  switch (failure?.type) {
    case "invitation-invalid":
    case "invitation-expired":
    case "member-exists":
      return { type: "invitation-invalid" };
    case "invitation-not-resendable":
      return { type: "invitation-not-resendable" };
    case "rate-limited":
      return {
        type: "rate-limited",
        retryAfterSeconds: (
          failure as Extract<IamMemberFailure, { type: "rate-limited" }>
        ).retryAfterSeconds,
      };
    case "invalid-request":
      return { type: "invalid-request" };
    // 403 `forbidden_action` (AC-8). Keeps its own identity instead of falling
    // through to `unknown`, whose UI offers a retry a 403 can never satisfy.
    case "forbidden":
      return { type: "forbidden" };
    case "network-error":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}
