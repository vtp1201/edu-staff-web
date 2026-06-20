import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class DeleteGroupUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  /** NOT_GROUP_ADMIN is enforced by the repo, returning `not-group-admin`. */
  async execute(groupId: string): Promise<Result<boolean, MessagingFailure>> {
    return this.repo.deleteGroup(groupId);
  }
}
