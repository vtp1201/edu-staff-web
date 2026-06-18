import type { ConversationEntity } from "../entities/conversation.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

export class CreateConversationUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    contactIds: string[],
    name?: string,
  ): Promise<Result<ConversationEntity, MessagingFailure>> {
    if (contactIds.length === 0) {
      return fail({ type: "create-conversation-failed" });
    }
    return this.repo.createConversation(contactIds, name);
  }
}
