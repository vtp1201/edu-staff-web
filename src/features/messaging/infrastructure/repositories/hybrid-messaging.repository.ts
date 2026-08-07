import "server-only";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { PinnedMessage } from "@/features/messaging/domain/entities/pinned-message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type {
  CreateGroupInput,
  IMessagingRepository,
  MessagePage,
  UpdateGroupInput,
} from "@/features/messaging/domain/repositories/i-messaging.repository";
import type { Result } from "@/features/messaging/domain/use-cases/result";

/**
 * US-E18.17 / ADR 0060 partial-real facade, narrowed twice since:
 *
 * US-E18.51 (BE US-192): message-pin is REAL — `pinMessage`/`unpinMessage`/
 * `getPinnedMessages` are served by `real` below.
 *
 * US-E18.50 (BE US-193, ADR 0132): the group-lifecycle slice is SPLIT. The old
 * "no self-service group-room capability exists at all" premise is dead, but
 * only two of its seven methods became real:
 *
 * | method              | served by | why                                          |
 * | ------------------- | --------- | -------------------------------------------- |
 * | `createGroup`       | **real**  | `POST /rooms/groups` (US-193) — `{name}` only |
 * | `deleteGroup`       | **real**  | `POST /rooms/{id}/archive` (US-193) — 204     |
 * | `getGroup`          | mock      | no endpoint yields a group with NAMED members |
 * | `updateGroup`       | mock      | no `PATCH`/`PUT /rooms/{roomId}` exists       |
 * | `addGroupMembers`   | mock      | add-member exists, but the `GroupEntity` return needs a 3-call fan-out + an entity reshape |
 * | `removeGroupMember` | mock      | same `GroupEntity` blocker as add-members     |
 * | `leaveGroup`        | mock      | self-leave exists but is not `custom`-scoped (would allow leaving a provisioned class_chat) |
 *
 * The contacts flow still has no real contract and stays force-served by `mock`
 * regardless of `NEXT_PUBLIC_USE_MOCK` (US-E18.52) — the same hybrid pattern as
 * US-E18.4/5/11.
 *
 * Consequence to keep in mind: in real mode a group CREATED here is real, but
 * its info panel (members, rename, add/remove) is still mock-backed. That
 * asymmetry is deliberate and documented, not a bug. The per-method reasoning
 * lives next to the stubs in `MessagingRepository`.
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
  // US-E18.51 — real pin board (BE US-192).
  pinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.real.pinMessage(conversationId, messageId);
  }
  unpinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return this.real.unpinMessage(conversationId, messageId);
  }
  getPinnedMessages(
    conversationId: string,
  ): Promise<Result<PinnedMessage[], MessagingFailure>> {
    return this.real.getPinnedMessages(conversationId);
  }

  // --- Real group-room slice (BE US-193 / ADR 0132, US-E18.50) ---
  createGroup(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return this.real.createGroup(input);
  }
  /** Real `POST /rooms/{roomId}/archive` — a soft archive, not a hard delete. */
  deleteGroup(groupId: string): Promise<Result<boolean, MessagingFailure>> {
    return this.real.deleteGroup(groupId);
  }

  // --- Force-mocked slice (no real contract, ADR 0060 + re-verified 0132) ---
  getContacts(): Promise<Result<ContactEntity[], MessagingFailure>> {
    return this.mock.getContacts();
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
}
