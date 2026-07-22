import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { fail, type Result } from "./result";

// Real `social` contract: self soft-delete is allowed within a 5-minute
// mutation window (`DELETE_WINDOW_EXPIRED`, ADR 0060) — NOT the previously
// web-invented 1 hour.
const FIVE_MINUTES_MS = 5 * 60 * 1000;

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
    if (Number.isNaN(sent) || this.now() - sent > FIVE_MINUTES_MS) {
      return fail({ type: "delete-message-failed", cause: "expired" });
    }
    return this.repo.deleteMessage(input.conversationId, input.messageId);
  }
}
