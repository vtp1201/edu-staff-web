import type { ContactEntity } from "../entities/contact.entity";
import type { ConversationEntity } from "../entities/conversation.entity";
import type { GroupEntity, GroupKind } from "../entities/group.entity";
import type { MessageEntity } from "../entities/message.entity";
import type { MessagingFailure } from "../failures/messaging.failure";
import type { Result } from "../use-cases/result";

export type MessagePage = {
  messages: MessageEntity[];
  nextCursor?: string;
  hasMore: boolean;
};

/** Input for INT-001 create group. */
export type CreateGroupInput = {
  name: string;
  description?: string;
  kind: GroupKind;
  color: string;
  memberIds: string[];
};

/** Partial update for INT-003 update group (admin only). */
export type UpdateGroupInput = {
  groupId: string;
  name?: string;
  description?: string;
  color?: string;
};

/**
 * Messaging repository contract (US-E10.1, extended US-E10.4). Implementations
 * return a `Result` discriminated union (never throw); use-cases / actions
 * surface the stable failure key. Wire fields are camelCase per the
 * api-integration rule. The `social` service is mock-first (decision 0017).
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

  // --- US-E10.4 group lifecycle ---
  createGroup(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>>;
  getGroup(groupId: string): Promise<Result<GroupEntity, MessagingFailure>>;
  updateGroup(
    input: UpdateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>>;
  addGroupMembers(
    groupId: string,
    memberIds: string[],
  ): Promise<Result<GroupEntity, MessagingFailure>>;
  removeGroupMember(
    groupId: string,
    userId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>>;
  leaveGroup(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>>;
  deleteGroup(groupId: string): Promise<Result<boolean, MessagingFailure>>;

  // --- US-E10.4 message interactions ---
  pinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>>;
  unpinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>>;
  deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>>;

  // --- US-E18.17 read-state + typing (real `social` rooms) ---
  /** Mark all messages in a conversation/room as read (`POST /rooms/{id}/read`). */
  markConversationRead(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>>;
  /** Best-effort outbound typing broadcast (`POST /rooms/{id}/typing`). A
   *  rate-limit (429) maps to a normal failure Result — never throws. */
  sendTypingIndicator(
    conversationId: string,
    typing: boolean,
  ): Promise<Result<boolean, MessagingFailure>>;
}
