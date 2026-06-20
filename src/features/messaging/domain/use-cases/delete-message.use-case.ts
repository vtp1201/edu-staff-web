import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

const ONE_HOUR_MS = 60 * 60 * 1000;

export type DeleteMessageInput = {
  conversationId: string;
  messageId: string;
  isMine: boolean;
  /** ISO8601 timestamp of when the message was sent. */
  sentAt: string;
};

/** Injectable clock for deterministic delete-window tests. */
export type Clock = () => number;

export class DeleteMessageUseCase {
  constructor(
    private readonly repo: IMessagingRepository,
    private readonly now: Clock = () => Date.now(),
  ) {}

  async execute(
    input: DeleteMessageInput,
  ): Promise<Result<boolean, MessagingFailure>> {
    if (!input.isMine) {
      return fail({ type: "delete-message-failed", cause: "not-own" });
    }
    const sent = Date.parse(input.sentAt);
    if (Number.isNaN(sent) || this.now() - sent > ONE_HOUR_MS) {
      return fail({ type: "delete-message-failed", cause: "expired" });
    }
    return this.repo.deleteMessage(input.conversationId, input.messageId);
  }
}
