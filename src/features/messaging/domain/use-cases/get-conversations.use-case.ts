import type { ConversationEntity } from "../entities/conversation.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class GetConversationsUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  execute(): Promise<Result<ConversationEntity[], MessagingFailure>> {
    return this.repo.getConversations();
  }
}
