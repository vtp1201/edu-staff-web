import type { MessagingFailure } from "../failures/messaging.failure";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import type { Result } from "./result";

/** US-E18.17 — best-effort outbound typing broadcast. Thin passthrough; the
 *  presentation call site swallows any failure (incl. 429 cooldown). */
export class SendTypingIndicatorUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  async execute(
    conversationId: string,
    typing: boolean,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.repo.sendTypingIndicator(conversationId, typing);
  }
}
