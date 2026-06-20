import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class LeaveGroupUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.repo.leaveGroup(conversationId);
  }
}
