import type { PinnedMessage } from "../entities/pinned-message.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

/**
 * US-E18.51 — reads a room's pin board. Thin passthrough: the board is its own
 * resource (any room member may read it), so there is nothing to compose with
 * group detail here.
 */
export class GetPinnedMessagesUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    conversationId: string,
  ): Promise<Result<PinnedMessage[], MessagingFailure>> {
    return this.repo.getPinnedMessages(conversationId);
  }
}
