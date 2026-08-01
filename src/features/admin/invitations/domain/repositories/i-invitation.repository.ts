import type {
  Invitation,
  InvitationStatus,
  SendInvitationBatchInput,
} from "../entities/invitation.entity";
import type { InvitationFailure } from "../failures/invitation.failure";
import type { Result } from "../use-cases/result";

/**
 * Per-email reconciliation of a batch send. The real send is a client-side
 * fan-out of N single-email `POST`s (ground-truth #2/#7), so a batch can
 * partially succeed — the split lets presentation build the toast count + mark
 * individual chips that the server rejected.
 */
export interface SendBatchOutcome {
  succeeded: { email: string; invitationId: string }[];
  failed: { email: string; failure: InvitationFailure }[];
}

/**
 * Server-side list params (US-E18.29 — `status` is a REAL wire param now).
 * There is no server search param: email substring search stays client-side
 * over the pages already loaded.
 */
export interface ListInvitationsParams {
  status?: InvitationStatus;
  cursor?: string;
  limit?: number;
}

/**
 * One cursor page. A SHORT (even empty) page with `hasMore: true` is normal —
 * BE applies `status` after a bounded keyset read, so the caller keeps following
 * `nextCursor` until `hasMore` is false.
 */
export interface InvitationsPage {
  data: Invitation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface IInvitationRepository {
  listInvitations(
    params?: ListInvitationsParams,
  ): Promise<Result<InvitationsPage, InvitationFailure>>;
  sendInvitationBatch(
    input: SendInvitationBatchInput,
  ): Promise<Result<SendBatchOutcome, InvitationFailure>>;
  resendInvitation(
    invitationId: string,
  ): Promise<Result<Invitation, InvitationFailure>>;
  revokeInvitation(
    invitationId: string,
  ): Promise<Result<void, InvitationFailure>>;
}
