import type { LucideIcon } from "lucide-react";
import type {
  Invitation,
  InvitationRole,
  InvitationStatus,
  InviteRoleOption,
  SendInvitationBatchInput,
} from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";

/**
 * Per-email reconciliation, unwrapped for presentation (mirrors the repo's
 * `SendBatchOutcome` 1:1 — re-declared here so this file has zero import from
 * `domain/repositories`, keeping the VM boundary self-contained).
 */
export interface SendBatchOutcomeVM {
  succeeded: { email: string; invitationId: string }[];
  failed: { email: string; failureKey: InvitationFailure["type"] }[];
}

export type SendBatchActionResult =
  | { ok: true; outcome: SendBatchOutcomeVM }
  | { ok: false; errorKey: InvitationFailure["type"] };

export type MutationActionResult =
  | { ok: true }
  | { ok: false; errorKey: InvitationFailure["type"] };

export type ListActionResult =
  | { ok: true; data: Invitation[] }
  | { ok: false; errorKey: InvitationFailure["type"] };

export type CountdownVariant = "normal" | "urgent" | "expired" | "na";

/**
 * Fully pre-resolved countdown cell — presentation builds this once per row so
 * `ExpiryCountdownCell` never re-derives urgency from `expiresAt` itself.
 */
export interface CountdownVM {
  variant: CountdownVariant;
  /** Already-translated text, e.g. "Còn 2 ngày" / "Hết hạn 12/07/2026" / "—". */
  text: string;
  /** Present for "urgent" (AlertTriangle) + "expired" (CalendarX) only. */
  icon?: LucideIcon;
}

/** The single row shape both the table and the mobile card list consume. */
export interface InvitationRowVM {
  id: string;
  email: string;
  role: InvitationRole;
  roleLabel: string;
  status: InvitationStatus;
  statusLabel: string;
  invitedBy: string;
  sentAtLabel: string;
  countdown: CountdownVM;
  actions: {
    copyLink: boolean; // pending only
    resend: boolean; // expired only
    revoke: boolean; // pending only
  };
  /** True while THIS row's resend or revoke mutation is in flight. */
  isRowMutating: boolean;
}

export type InvitationsStatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

export type InvitationsStatusCounts = Record<InvitationsStatusFilter, number>;

export interface InvitationsScreenProps {
  /** RSC-seeded first page (initialData for the list query). */
  initialInvitations: Invitation[];
  /** True when the initial RSC fetch itself failed — seeds the query error. */
  initialLoadFailed: boolean;
  /** Route-segment tenant id — query-key/display segment only (not the
   * NFR-006 server-derived request value). */
  tenantId: string;

  onRefresh: () => Promise<ListActionResult>;
  onSendBatch: (
    input: SendInvitationBatchInput,
  ) => Promise<SendBatchActionResult>;
  onResend: (invitationId: string) => Promise<MutationActionResult>;
  onRevoke: (invitationId: string) => Promise<MutationActionResult>;
}

export type { InviteRoleOption };
