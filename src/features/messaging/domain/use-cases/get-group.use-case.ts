import type { GroupEntity } from "../entities/group.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class GetGroupUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    groupId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.repo.getGroup(groupId);
  }
}
