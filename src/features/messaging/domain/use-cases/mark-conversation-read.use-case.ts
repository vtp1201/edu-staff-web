import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

/** US-E18.17 — mark all messages in a conversation/room as read. Thin
 *  passthrough (same shape as LeaveGroupUseCase). */
export class MarkConversationReadUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.repo.markConversationRead(conversationId);
  }
}
