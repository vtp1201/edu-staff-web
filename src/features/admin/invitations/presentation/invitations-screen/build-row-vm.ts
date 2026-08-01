import { AlertTriangle, CalendarX } from "lucide-react";
import type {
  Invitation,
  InvitationStatus,
} from "../../domain/entities/invitation.entity";
import type { CountdownVM, InvitationRowVM } from "./invitations-screen.i-vm";

const DAY_MS = 86_400_000;

export interface CountdownLabels {
  /** e.g. t("countdown.daysLeft", { days: n }) — ICU plural. */
  daysLeft: (days: number) => string;
  /** e.g. t("countdown.expiredOn", { date }). */
  expiredOn: (date: string) => string;
  /** em-dash placeholder. */
  notApplicable: string;
  /** Formats an ISO timestamp to a display date string. */
  formatDate: (iso: string) => string;
}

/**
 * Pure countdown derivation (UC-007, decision 0046 — urgency never color-only).
 * `now` is injected for deterministic tests. Urgent = pending with <3 days left
 * → bold + AlertTriangle icon; expired → muted + CalendarX; accepted/revoked →
 * em-dash (n/a).
 */
export function buildCountdown(
  status: InvitationStatus,
  expiresAt: string,
  now: number,
  labels: CountdownLabels,
): CountdownVM {
  if (status === "accepted" || status === "revoked") {
    return { variant: "na", text: labels.notApplicable };
  }
  if (status === "expired") {
    return {
      variant: "expired",
      text: labels.expiredOn(labels.formatDate(expiresAt)),
      icon: CalendarX,
    };
  }
  // pending
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - now) / DAY_MS),
  );
  if (daysLeft < 3) {
    return {
      variant: "urgent",
      text: labels.daysLeft(daysLeft),
      icon: AlertTriangle,
    };
  }
  return { variant: "normal", text: labels.daysLeft(daysLeft) };
}

export interface RowVMLabels {
  roleLabelOf: (role: Invitation["role"]) => string;
  statusLabelOf: (status: InvitationStatus) => string;
  sentAtLabelOf: (iso: string) => string;
  /**
   * Shown when `invitedBy` is blank — i.e. the inviter's userId could not be
   * resolved to a display name (AC-3). The repository never leaks a raw UUID,
   * it blanks the field, so the human-readable placeholder belongs here.
   */
  invitedByFallback: string;
  countdown: CountdownLabels;
}

/** Builds the row view-model for one invitation (label/i18n resolution done
 *  here at the presentation boundary, never in domain). */
export function buildRowVM(
  inv: Invitation,
  now: number,
  labels: RowVMLabels,
  isRowMutating: boolean,
): InvitationRowVM {
  return {
    id: inv.id,
    email: inv.email,
    role: inv.role,
    roleLabel: labels.roleLabelOf(inv.role),
    status: inv.status,
    statusLabel: labels.statusLabelOf(inv.status),
    invitedBy: inv.invitedBy || labels.invitedByFallback,
    sentAtLabel: labels.sentAtLabelOf(inv.sentAt),
    countdown: buildCountdown(inv.status, inv.expiresAt, now, labels.countdown),
    actions: {
      copyLink: inv.status === "pending",
      resend: inv.status === "expired",
      revoke: inv.status === "pending",
    },
    isRowMutating,
  };
}
