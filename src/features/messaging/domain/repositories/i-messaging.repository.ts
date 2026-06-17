import type { ContactEntity } from "../entities/contact.entity";
import type { ConversationEntity } from "../entities/conversation.entity";
import type { MessageEntity } from "../entities/message.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { Result } from "../use-cases/result";

export type MessagePage = {
  messages: MessageEntity[];
  nextCursor?: string;
  hasMore: boolean;
};

/**
 * Messaging repository contract (US-E10.1). Implementations return a `Result`
 * discriminated union (never throw); use-cases / actions surface the stable
 * failure key. Wire fields are camelCase per the api-integration rule. The
 * `social` service is mock-first (decision 0017) until it ships.
 */
export interface IMessagingRepository {
  getConversations(): Promise<Result<ConversationEntity[], MessagingFailure>>;
  getMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<Result<MessagePage, MessagingFailure>>;
  sendMessage(
    conversationId: string,
    text: string,
  ): Promise<Result<MessageEntity, MessagingFailure>>;
  createConversation(
    contactIds: string[],
    name?: string,
  ): Promise<Result<ConversationEntity, MessagingFailure>>;
  getContacts(): Promise<Result<ContactEntity[], MessagingFailure>>;
}
