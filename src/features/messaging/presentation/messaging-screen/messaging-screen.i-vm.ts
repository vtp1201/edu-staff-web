import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type { CreateGroupFormValues } from "@/features/messaging/presentation/create-group-modal";

/** Server → client contract for the messaging screen. */
export interface MessagingScreenVM {
  initialConversations: ConversationEntity[];
  initialContacts: ContactEntity[];
  /** Set when the SSR conversation load failed → pane-left error banner (AC-9). */
  loadError?: MessagingFailure["type"];
  /** Synthetic id of the current user (mock-first auth). */
  selfId?: string;
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

export type CreateGroupResult =
  | { ok: true; value: GroupEntity }
  | { ok: false; errorKey: MessagingFailure["type"] };

export type GetGroupResult =
  | { ok: true; value: GroupEntity }
  | { ok: false; errorKey: MessagingFailure["type"] };

/** Boolean-result action shape shared by pin / delete / leave / delete-group. */
export type ActionResult =
  | { ok: true }
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

  // --- US-E10.4 ---
  createGroupAction: (
    values: CreateGroupFormValues,
  ) => Promise<CreateGroupResult>;
  getGroupAction: (groupId: string) => Promise<GetGroupResult>;
  pinMessageAction: (
    conversationId: string,
    messageId: string,
  ) => Promise<ActionResult>;
  deleteMessageAction: (
    conversationId: string,
    messageId: string,
    sentAt: string,
  ) => Promise<ActionResult>;
  removeGroupMemberAction: (
    groupId: string,
    userId: string,
  ) => Promise<GetGroupResult>;
  addGroupMembersAction: (
    groupId: string,
    memberIds: string[],
  ) => Promise<GetGroupResult>;
  leaveGroupAction: (conversationId: string) => Promise<ActionResult>;
  deleteGroupAction: (groupId: string) => Promise<ActionResult>;
  updateGroupAction: (
    groupId: string,
    name: string,
    description: string,
  ) => Promise<GetGroupResult>;
}
