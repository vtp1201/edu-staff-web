import type { MessageEntity } from "../entities/message.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

const MAX_MESSAGE_LENGTH = 2000;

export class SendMessageUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    conversationId: string,
    text: string,
  ): Promise<Result<MessageEntity, MessagingFailure>> {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
      return fail({ type: "send-message-failed" });
    }
    return this.repo.sendMessage(conversationId, text);
  }
}
