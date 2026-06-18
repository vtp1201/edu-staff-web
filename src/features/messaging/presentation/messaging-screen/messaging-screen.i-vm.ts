import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

/** Server → client contract for the messaging screen. */
export interface MessagingScreenVM {
  initialConversations: ConversationEntity[];
  initialContacts: ContactEntity[];
  /** Set when the SSR conversation load failed → pane-left error banner (AC-9). */
  loadError?: MessagingFailure["type"];
}

/** Result of a sendMessage / createConversation server action. */
export type SendMessageResult =
  | { ok: true; value: MessageEntity }
  | { ok: false; errorKey: MessagingFailure["type"] };

export type CreateConversationResult =
  | { ok: true; value: ConversationEntity }
  | { ok: false; errorKey: MessagingFailure["type"] };

export type GetMessagesResult =
  | { ok: true; value: MessageEntity[] }
  | { ok: false; errorKey: MessagingFailure["type"] };

export interface MessagingScreenActions {
  sendMessageAction: (
    conversationId: string,
    text: string,
  ) => Promise<SendMessageResult>;
  createConversationAction: (
    contactIds: string[],
    name?: string,
  ) => Promise<CreateConversationResult>;
  getMessagesAction: (conversationId: string) => Promise<GetMessagesResult>;
}
