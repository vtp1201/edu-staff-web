import type { Invitation } from "../entities/invitation.entity";
import type { InvitationFailure } from "../failures/invitation.failure";
import type { IInvitationRepository } from "../repositories/i-invitation.repository";
import type { Result } from "./result";

/** Resend an expired invitation (US-E21.1, UC-005). Thin passthrough. */
export class ResendInvitationUseCase {
  constructor(private readonly repo: IInvitationRepository) {}

  execute(
    invitationId: string,
  ): Promise<Result<Invitation, InvitationFailure>> {
    return this.repo.resendInvitation(invitationId);
  }
}
