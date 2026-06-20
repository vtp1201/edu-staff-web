import type { GroupEntity } from "../entities/group.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

export class AddGroupMembersUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    groupId: string,
    memberIds: string[],
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    if (memberIds.length < 1) {
      return fail({ type: "group-mutation-failed", cause: "validation" });
    }
    return this.repo.addGroupMembers(groupId, memberIds);
  }
}
