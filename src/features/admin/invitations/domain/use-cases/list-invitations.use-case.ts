import type { Invitation } from "../entities/invitation.entity";
import type { InvitationFailure } from "../failures/invitation.failure";
import type { IInvitationRepository } from "../repositories/i-invitation.repository";
import type { Result } from "./result";

/** List tenant invitations (US-E21.1, UC-001). Thin passthrough — filtering is
 * client-side (ground-truth #1: no server filter param exists). */
export class ListInvitationsUseCase {
  constructor(private readonly repo: IInvitationRepository) {}

  execute(): Promise<Result<Invitation[], InvitationFailure>> {
    return this.repo.listInvitations();
  }
}
