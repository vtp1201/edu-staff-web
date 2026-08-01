import type { InvitationFailure } from "../failures/invitation.failure";
import type {
  IInvitationRepository,
  InvitationsPage,
  ListInvitationsParams,
} from "../repositories/i-invitation.repository";
import type { Result } from "./result";

/**
 * List tenant invitations (US-E21.1 UC-001, wired real in US-E18.29).
 *
 * Thin passthrough of the real server params (`status`/`cursor`/`limit`). Email
 * substring search has NO wire param and stays client-side. An empty page is a
 * valid success — notably `status=expired`, which BE TTL-sweeps.
 */
export class ListInvitationsUseCase {
  constructor(private readonly repo: IInvitationRepository) {}

  execute(
    params?: ListInvitationsParams,
  ): Promise<Result<InvitationsPage, InvitationFailure>> {
    return this.repo.listInvitations(params);
  }
}
