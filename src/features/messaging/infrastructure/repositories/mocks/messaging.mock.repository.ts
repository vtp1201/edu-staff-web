import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
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
import {
  fail,
  ok,
  type Result,
} from "@/features/messaging/domain/use-cases/result";
import {
  MOCK_CONTACTS,
  MOCK_CONVERSATIONS,
  MOCK_GROUPS,
  MOCK_MESSAGES,
  MOCK_SELF_ID,
} from "./fixtures";

const cloneGroup = (g: GroupEntity): GroupEntity => ({
  ...g,
  members: g.members.map((m) => ({ ...m })),
  pinnedMessages: g.pinnedMessages.map((p) => ({ ...p })),
});

const PAGE_SIZE = 20;

/**
 * In-memory mock for the `social` service (not yet shipped — decision 0017).
 * State is cloned from fixtures per instance; the DI factory builds a new
 * instance per request so seed data never mutates globally.
 */
export class MockMessagingRepository implements IMessagingRepository {
  private conversations: ConversationEntity[];
  private messages: Record<string, MessageEntity[]>;
  private readonly contacts: ContactEntity[];
  private groups: Record<string, GroupEntity>;
  private seq = 0;

  constructor() {
    this.conversations = MOCK_CONVERSATIONS.map((c) => ({ ...c }));
    this.messages = Object.fromEntries(
      Object.entries(MOCK_MESSAGES).map(([id, list]) => [
        id,
        list.map((msg) => ({ ...msg })),
      ]),
    );
    this.contacts = MOCK_CONTACTS.map((c) => ({ ...c }));
    this.groups = Object.fromEntries(
      Object.entries(MOCK_GROUPS).map(([id, g]) => [id, cloneGroup(g)]),
    );
  }

  /** Whether the current user is admin of a given group (mock auth). */
  private selfIsAdmin(groupId: string): boolean {
    const g = this.groups[groupId];
    return Boolean(
      g?.members.some((m) => m.userId === MOCK_SELF_ID && m.role === "admin"),
    );
  }

  async getConversations(): Promise<
    Result<ConversationEntity[], MessagingFailure>
  > {
    await mockDelay(300);
    return ok(this.conversations.map((c) => ({ ...c })));
  }

  async getMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<Result<MessagePage, MessagingFailure>> {
    await mockDelay(200);
    const all = this.messages[conversationId] ?? [];
    const start = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
    const slice = all.slice(start, start + PAGE_SIZE);
    const nextStart = start + PAGE_SIZE;
    const hasMore = nextStart < all.length;
    return ok({
      messages: slice.map((m) => ({ ...m })),
      nextCursor: hasMore ? String(nextStart) : undefined,
      hasMore,
    });
  }

  async sendMessage(
    conversationId: string,
    text: string,
  ): Promise<Result<MessageEntity, MessagingFailure>> {
    await mockDelay(100);
    this.seq += 1;
    const now = new Date();
    const message: MessageEntity = {
      id: `local-${Date.now()}-${this.seq}`,
      conversationId,
      from: "me",
      text: text.trim(),
      time: `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`,
      date: "Hôm nay",
    };
    const existing = this.messages[conversationId] ?? [];
    this.messages[conversationId] = [...existing, message];
    return ok({ ...message });
  }

  async createConversation(
    contactIds: string[],
    name?: string,
  ): Promise<Result<ConversationEntity, MessagingFailure>> {
    await mockDelay(200);
    this.seq += 1;
    const contact = this.contacts.find((c) => c.id === contactIds[0]);
    const conversation: ConversationEntity = {
      id: contact?.id ?? `c-${Date.now()}-${this.seq}`,
      type: contactIds.length > 1 ? "group" : "direct",
      name: name ?? contact?.name ?? "Cuộc trò chuyện mới",
      avatarInitials: contact?.avatarInitials ?? "?",
      color: contact?.color ?? "primary",
      lastMessage: "",
      lastMessageTime: "",
      unreadCount: 0,
      isOnline:
        contactIds.length > 1 ? undefined : (contact?.isOnline ?? false),
      memberCount: contactIds.length > 1 ? contactIds.length : undefined,
    };
    const without = this.conversations.filter((c) => c.id !== conversation.id);
    this.conversations = [conversation, ...without];
    if (!this.messages[conversation.id]) this.messages[conversation.id] = [];
    return ok({ ...conversation });
  }

  async getContacts(): Promise<Result<ContactEntity[], MessagingFailure>> {
    await mockDelay(150);
    return ok(this.contacts.map((c) => ({ ...c })));
  }

  // --- US-E10.4 group lifecycle ---

  async createGroup(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    await mockDelay(250);
    this.seq += 1;
    const id = `g-${Date.now()}-${this.seq}`;
    const initials = input.name
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
    const memberRows = input.memberIds.map((userId) => {
      const c = this.contacts.find((x) => x.id === userId);
      return {
        userId,
        name: c?.name ?? userId,
        initials: c?.avatarInitials ?? "?",
        color: c?.color ?? "primary",
        role: "member" as const,
        isOnline: c?.isOnline ?? false,
      };
    });
    const group: GroupEntity = {
      id,
      name: input.name.trim(),
      description: input.description ?? "",
      kind: input.kind,
      color: input.color,
      conversationId: id,
      // Creator becomes admin (TR-008).
      members: [
        {
          userId: MOCK_SELF_ID,
          name: "Nguyễn Thị Hương",
          initials: "NH",
          color: "primary",
          role: "admin",
          isOnline: true,
        },
        ...memberRows,
      ],
      pinnedMessages: [],
    };
    this.groups[id] = group;
    const conversation: ConversationEntity = {
      id,
      type: "group",
      name: group.name,
      avatarInitials: initials || "?",
      color: group.color,
      lastMessage: "",
      lastMessageTime: "",
      unreadCount: 0,
      memberCount: group.members.length,
      selfIsGroupAdmin: true,
    };
    this.conversations = [conversation, ...this.conversations];
    if (!this.messages[id]) this.messages[id] = [];
    return ok(cloneGroup(group));
  }

  async getGroup(
    groupId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    await mockDelay(200);
    const g = this.groups[groupId];
    if (!g) return fail({ type: "group-mutation-failed", cause: "not-found" });
    return ok(cloneGroup(g));
  }

  async updateGroup(
    input: UpdateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    await mockDelay(200);
    const g = this.groups[input.groupId];
    if (!g) return fail({ type: "group-mutation-failed", cause: "not-found" });
    if (!this.selfIsAdmin(input.groupId))
      return fail({ type: "not-group-admin" });
    if (input.name !== undefined) g.name = input.name.trim();
    if (input.description !== undefined) g.description = input.description;
    if (input.color !== undefined) g.color = input.color;
    this.conversations = this.conversations.map((c) =>
      c.id === input.groupId ? { ...c, name: g.name, color: g.color } : c,
    );
    return ok(cloneGroup(g));
  }

  async addGroupMembers(
    groupId: string,
    memberIds: string[],
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    await mockDelay(200);
    const g = this.groups[groupId];
    if (!g) return fail({ type: "group-mutation-failed", cause: "not-found" });
    if (!this.selfIsAdmin(groupId)) return fail({ type: "not-group-admin" });
    for (const userId of memberIds) {
      if (g.members.some((m) => m.userId === userId)) continue;
      const c = this.contacts.find((x) => x.id === userId);
      g.members.push({
        userId,
        name: c?.name ?? userId,
        initials: c?.avatarInitials ?? "?",
        color: c?.color ?? "primary",
        role: "member",
        isOnline: c?.isOnline ?? false,
      });
    }
    this.syncMemberCount(groupId, g.members.length);
    return ok(cloneGroup(g));
  }

  async removeGroupMember(
    groupId: string,
    userId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    await mockDelay(200);
    const g = this.groups[groupId];
    if (!g) return fail({ type: "group-mutation-failed", cause: "not-found" });
    if (!this.selfIsAdmin(groupId)) return fail({ type: "not-group-admin" });
    const target = g.members.find((m) => m.userId === userId);
    if (!target) {
      return fail({ type: "group-mutation-failed", cause: "member-not-found" });
    }
    // Cannot remove self or another admin (TR-011).
    if (userId === MOCK_SELF_ID || target.role === "admin") {
      return fail({ type: "not-group-admin" });
    }
    g.members = g.members.filter((m) => m.userId !== userId);
    this.syncMemberCount(groupId, g.members.length);
    return ok(cloneGroup(g));
  }

  async leaveGroup(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    await mockDelay(200);
    const exists = this.conversations.some((c) => c.id === conversationId);
    if (!exists)
      return fail({ type: "leave-group-failed", cause: "not-found" });
    this.conversations = this.conversations.filter(
      (c) => c.id !== conversationId,
    );
    delete this.groups[conversationId];
    return ok(true);
  }

  async deleteGroup(
    groupId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    await mockDelay(200);
    const g = this.groups[groupId];
    if (!g) return fail({ type: "group-mutation-failed", cause: "not-found" });
    if (!this.selfIsAdmin(groupId)) return fail({ type: "not-group-admin" });
    delete this.groups[groupId];
    this.conversations = this.conversations.filter((c) => c.id !== groupId);
    return ok(true);
  }

  // --- US-E10.4 message interactions ---

  async pinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    await mockDelay(150);
    const g = this.groups[conversationId];
    const list = this.messages[conversationId] ?? [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return fail({ type: "pin-failed", cause: "not-found" });
    // Group pin is admin-only (TR-015); direct messages allow anyone.
    if (g && !this.selfIsAdmin(conversationId)) {
      return fail({ type: "not-group-admin" });
    }
    msg.isPinned = true;
    if (g && !g.pinnedMessages.some((p) => p.messageId === messageId)) {
      g.pinnedMessages = [
        {
          messageId,
          senderId: msg.from === "me" ? MOCK_SELF_ID : (msg.senderName ?? ""),
          senderName: msg.from === "me" ? "Bạn" : (msg.senderName ?? ""),
          excerpt: msg.text.slice(0, 80),
          sentAt: msg.sentAt ?? new Date().toISOString(),
        },
        ...g.pinnedMessages,
      ];
    }
    return ok(true);
  }

  async unpinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    await mockDelay(150);
    const g = this.groups[conversationId];
    const list = this.messages[conversationId] ?? [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg) return fail({ type: "pin-failed", cause: "not-found" });
    if (g && !this.selfIsAdmin(conversationId)) {
      return fail({ type: "not-group-admin" });
    }
    msg.isPinned = false;
    if (g) {
      g.pinnedMessages = g.pinnedMessages.filter(
        (p) => p.messageId !== messageId,
      );
    }
    return ok(true);
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    await mockDelay(150);
    const list = this.messages[conversationId] ?? [];
    const msg = list.find((m) => m.id === messageId);
    if (!msg)
      return fail({ type: "delete-message-failed", cause: "not-found" });
    if (msg.from !== "me") {
      return fail({ type: "delete-message-failed", cause: "not-own" });
    }
    msg.isDeleted = true;
    return ok(true);
  }

  private syncMemberCount(groupId: string, count: number): void {
    this.conversations = this.conversations.map((c) =>
      c.id === groupId ? { ...c, memberCount: count } : c,
    );
  }
}
