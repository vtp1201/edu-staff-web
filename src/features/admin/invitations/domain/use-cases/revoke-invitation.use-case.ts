import type { InvitationFailure } from "../failures/invitation.failure";
import type { IInvitationRepository } from "../repositories/i-invitation.repository";
import type { Result } from "./result";

/** Revoke a pending invitation (US-E21.1, UC-006). Thin passthrough. */
export class RevokeInvitationUseCase {
  constructor(private readonly repo: IInvitationRepository) {}

  execute(invitationId: string): Promise<Result<void, InvitationFailure>> {
    return this.repo.revokeInvitation(invitationId);
  }
}
