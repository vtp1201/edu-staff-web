import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class PinMessageUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  /**
   * Pins a message. For group conversations the repo enforces admin-only and
   * returns `not-group-admin`; other failures map to `pin-failed`.
   */
  async execute(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.repo.pinMessage(conversationId, messageId);
  }
}
