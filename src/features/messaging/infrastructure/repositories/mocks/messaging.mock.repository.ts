import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type {
  IMessagingRepository,
  MessagePage,
} from "@/features/messaging/domain/repositories/i-messaging.repository";
import { ok, type Result } from "@/features/messaging/domain/use-cases/result";
import { MOCK_CONTACTS, MOCK_CONVERSATIONS, MOCK_MESSAGES } from "./fixtures";

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
}
