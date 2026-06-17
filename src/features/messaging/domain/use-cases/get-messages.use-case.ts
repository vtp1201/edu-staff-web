import type { MessagingFailure } from "../failures/messaging.failure";
import type {
  IMessagingRepository,
  MessagePage,
} from "../repositories/i-messaging.repository";
import type { Result } from "./result";

export class GetMessagesUseCase {
  constructor(private readonly repo: IMessagingRepository) {}

  execute(
    conversationId: string,
    cursor?: string,
  ): Promise<Result<MessagePage, MessagingFailure>> {
    return this.repo.getMessages(conversationId, cursor);
  }
}
