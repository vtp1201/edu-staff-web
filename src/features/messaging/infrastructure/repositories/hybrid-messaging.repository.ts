import "server-only";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type {
  CreateGroupInput,
  IMessagingRepository,
  MessagePage,
  UpdateGroupInput,
} from "@/features/messaging/domain/repositories/i-messaging.repository";
import type { Result } from "@/features/messaging/domain/use-cases/result";

/**
 * US-E18.17 / ADR 0060 partial-real facade. The rooms/messages/read/typing/
 * 1:1-DM slice has a real `social` contract and is served by `real`; the group
 * lifecycle, message-pin, and contacts flows have NO real contract and are
 * force-served by `mock` regardless of `NEXT_PUBLIC_USE_MOCK` — the same hybrid
 * pattern as US-E18.4/US-E18.5/US-E18.11. Zero UI/behavior change for the
 * force-mocked flows.
 */
export class HybridMessagingRepository implements IMessagingRepository {
  constructor(
    private readonly real: IMessagingRepository,
    private readonly mock: IMessagingRepository,
  ) {}

  // --- Real slice ---
  getConversations(): Promise<Result<ConversationEntity[], MessagingFailure>> {
    return this.real.getConversations();
  }
  getMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<Result<MessagePage, MessagingFailure>> {
    return this.real.getMessages(conversationId, cursor);
  }
  sendMessage(
    conversationId: string,
    text: string,
  ): Promise<Result<MessageEntity, MessagingFailure>> {
    return this.real.sendMessage(conversationId, text);
  }
  deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.real.deleteMessage(conversationId, messageId);
  }
  createConversation(
    contactIds: string[],
    name?: string,
  ): Promise<Result<ConversationEntity, MessagingFailure>> {
    return this.real.createConversation(contactIds, name);
  }
  markConversationRead(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.real.markConversationRead(conversationId);
  }
  sendTypingIndicator(
    conversationId: string,
    typing: boolean,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.real.sendTypingIndicator(conversationId, typing);
  }

  // --- Force-mocked slice (no real contract, ADR 0060) ---
  getContacts(): Promise<Result<ContactEntity[], MessagingFailure>> {
    return this.mock.getContacts();
  }
  createGroup(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.mock.createGroup(input);
  }
  getGroup(groupId: string): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.mock.getGroup(groupId);
  }
  updateGroup(
    input: UpdateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.mock.updateGroup(input);
  }
  addGroupMembers(
    groupId: string,
    memberIds: string[],
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.mock.addGroupMembers(groupId, memberIds);
  }
  removeGroupMember(
    groupId: string,
    userId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.mock.removeGroupMember(groupId, userId);
  }
  leaveGroup(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.mock.leaveGroup(conversationId);
  }
  deleteGroup(groupId: string): Promise<Result<boolean, MessagingFailure>> {
    return this.mock.deleteGroup(groupId);
  }
  pinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.mock.pinMessage(conversationId, messageId);
  }
  unpinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.mock.unpinMessage(conversationId, messageId);
  }
}
