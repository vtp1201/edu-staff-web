import type { GroupEntity } from "../entities/group.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class RemoveGroupMemberUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  /**
   * Removes a member. NOT_GROUP_ADMIN / CANNOT_REMOVE_ADMIN / CANNOT_REMOVE_SELF
   * are enforced by the repo, which returns the `not-group-admin` failure.
   */
  async execute(
    groupId: string,
    userId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.repo.removeGroupMember(groupId, userId);
  }
}
