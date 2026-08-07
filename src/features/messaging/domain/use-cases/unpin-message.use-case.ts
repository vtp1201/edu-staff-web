import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

/**
 * US-E18.51 — unpins a message. Unpin is a MODERATION action requiring the
 * room's `moderate_msg` capability; it is NOT restricted to the original
 * pinner, and it deliberately works even when the underlying message is gone
 * (that is how a moderator clears a stale pin).
 */
export class UnpinMessageUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.repo.unpinMessage(conversationId, messageId);
  }
}
