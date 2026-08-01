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
  | {
      ok: false;
      errorKey: InvitationFailure["type"];
      /**
       * Only ever set for `rate-limited` (429 `Retry-After`, seconds). A stable
       * NUMBER, not translated copy — presentation interpolates it, or falls
       * back to a wait-less string when the server sent no header.
       */
      retryAfterSeconds?: number;
    };

/**
 * One cursor page, unwrapped for presentation (mirrors the repo's
 * `InvitationsPage` 1:1 — re-declared here so this file keeps zero imports from
 * `domain/repositories`, same convention as `SendBatchOutcomeVM` above).
 */
export interface InvitationsPageVM {
  data: Invitation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ListActionResult =
  | { ok: true; data: InvitationsPageVM }
  | {
      ok: false;
      errorKey: InvitationFailure["type"];
      /**
       * Whether re-issuing the SAME request could yield a different outcome —
       * decided server-side by `isRetryableInvitationFailure`. Drives the
       * query's `retry` predicate, so a 403/400/409-class failure never burns a
       * pointless retry (state-architecture.md §3).
       */
      retryable: boolean;
    };

/** Server params of one list request (`status` omitted = the "all" tab). */
export interface ListInvitationsRequest {
  status?: InvitationStatus;
  cursor?: string;
}

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

export interface InvitationsScreenProps {
  /**
   * RSC-seeded FIRST page of the default ("all") tab — `initialData` for that
   * tab's infinite query only. Any other tab runs a normal cold client fetch.
   */
  initialPage: InvitationsPageVM;
  /** True when the initial RSC fetch itself failed — seeds the query error. */
  initialLoadFailed: boolean;
  /** Route-segment tenant id — query-key/display segment only (not the
   * NFR-006 server-derived request value). */
  tenantId: string;

  onRefresh: (params: ListInvitationsRequest) => Promise<ListActionResult>;
  onSendBatch: (
    input: SendInvitationBatchInput,
  ) => Promise<SendBatchActionResult>;
  onResend: (invitationId: string) => Promise<MutationActionResult>;
  onRevoke: (invitationId: string) => Promise<MutationActionResult>;
}

export type { InviteRoleOption };
