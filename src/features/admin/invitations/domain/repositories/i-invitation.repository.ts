import type {
  Invitation,
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

export interface IInvitationRepository {
  listInvitations(): Promise<Result<Invitation[], InvitationFailure>>;
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
