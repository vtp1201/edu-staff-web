import "server-only";
import type { AxiosInstance } from "axios";
import { MESSAGING_EP } from "@/bootstrap/endpoint/messaging.endpoint";
import {
  NOTIFICATION_EP,
  type RoomUnreadCountDto,
} from "@/bootstrap/endpoint/notification.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
} from "@/bootstrap/lib/api-envelope";
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
import type { RoomMessageResponseDto } from "../dtos/room-message-response.dto";
import type { RoomSummaryResponseDto } from "../dtos/room-summary-response.dto";
import type { SchoolDmResponseDto } from "../dtos/school-dm-response.dto";
import {
  toConversationEntityFromRoom,
  toMessageEntityFromRoom,
} from "../mappers/messaging.mapper";

/**
 * Real `social` repository, remapped onto the ground-truthed rooms/messages/
 * read/typing/school-dm contract (US-E18.17, ADR 0060). The HTTP interceptor
 * unwraps the success envelope, so non-list calls receive the payload directly;
 * list calls pass `{ raw: true }` (top-level axios-config sibling of `params` —
 * a recurring bug class) and use `parseEnvelope()` for real cursor pagination.
 * Errors are mapped to the failure union by `errorCodeOf` (UPPER_SNAKE code),
 * never by message.
 *
 * `currentUserId` is resolved server-side from the access-token `sub` claim in
 * the DI factory (same precedent as attendance/teacher-class); it is required
 * for the mandatory `?userId=` filter on `GET /rooms` and for `me` vs `other`
 * message attribution.
 *
 * The group lifecycle / message-pin / contacts methods have NO real contract
 * (ADR 0060); they return a fail Result with a `not-supported-by-real-contract`
 * cause here (never a doomed HTTP call), and the DI factory force-mocks them so
 * those flows keep their mock behavior unchanged.
 */
export class MessagingRepository implements IMessagingRepository {
  constructor(
    private readonly http: AxiosInstance,
    private readonly currentUserId: string | null,
  ) {}

  async getConversations(): Promise<
    Result<ConversationEntity[], MessagingFailure>
  > {
    if (!this.currentUserId) {
      // Never call GET /rooms without a userId (would trip
      // ROOM_LIST_FILTER_REQUIRED); fail fast on a missing/malformed token.
      return fail({
        type: "load-conversations-failed",
        cause: "no-current-user",
      });
    }
    try {
      const env = (await this.http.get(MESSAGING_EP.rooms, {
        params: { userId: this.currentUserId },
        raw: true,
      })) as unknown as ApiEnvelope<RoomSummaryResponseDto[]>;
      const { data } = parseEnvelope(env);
      const conversations = (data ?? []).map(toConversationEntityFromRoom);
      // US-E18.18 / ADR 0060 ask #32(a): enrich the real per-room unread counts
      // best-effort — a failure here must never fail the whole list.
      return ok(await this.enrichUnreadCounts(conversations));
    } catch (err) {
      return fail({
        type: "load-conversations-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  /**
   * US-E18.18 — best-effort per-room unread enrichment via the notification
   * service `GET /notifications/unread-counts?roomIds=...` (enveloped → the
   * interceptor unwraps to the array; no pagination, no `raw:true`). Merges the
   * real `unreadCount` by `roomId`; on ANY failure it degrades to the mapper's
   * default (`0`) and returns the conversations unchanged — additive, never
   * blocking (same graceful-degradation precedent as US-E18.2). This closes the
   * `toConversationEntityFromRoom` GAP (server-tracked unread was a wire gap).
   */
  private async enrichUnreadCounts(
    conversations: ConversationEntity[],
  ): Promise<ConversationEntity[]> {
    if (conversations.length === 0) return conversations;
    try {
      const roomIds = conversations.map((c) => c.id);
      const rows = (await this.http.get(
        NOTIFICATION_EP.unreadCounts(roomIds),
      )) as unknown as RoomUnreadCountDto[];
      const byRoom = new Map(
        (rows ?? []).map((r) => [r.roomId, r.unreadCount]),
      );
      return conversations.map((c) => {
        const unread = byRoom.get(c.id);
        return unread === undefined ? c : { ...c, unreadCount: unread };
      });
    } catch {
      return conversations;
    }
  }

  async getMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<Result<MessagePage, MessagingFailure>> {
    try {
      const params: Record<string, unknown> = {};
      if (cursor) params.cursor = cursor;
      const env = (await this.http.get(
        MESSAGING_EP.roomMessages(conversationId),
        { params, raw: true },
      )) as unknown as ApiEnvelope<RoomMessageResponseDto[]>;
      const { data, pagination } = parseEnvelope(env);
      return ok({
        messages: (data ?? []).map((dto) =>
          toMessageEntityFromRoom(dto, this.currentUserId),
        ),
        nextCursor: pagination?.nextCursor ?? undefined,
        hasMore: pagination?.hasMore ?? false,
      });
    } catch (err) {
      return fail({
        type: "load-messages-failed",
        conversationId,
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async sendMessage(
    conversationId: string,
    text: string,
  ): Promise<Result<MessageEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.post(
        MESSAGING_EP.roomMessages(conversationId),
        { text },
      )) as unknown as RoomMessageResponseDto;
      return ok(toMessageEntityFromRoom(dto, this.currentUserId));
    } catch (err) {
      return fail({
        type: "send-message-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.delete(
        MESSAGING_EP.roomMessageById(conversationId, messageId),
      );
      return ok(true);
    } catch (err) {
      const code = errorCodeOf(err);
      // Reactive 403 past the 5-minute window (client/server race) — distinct
      // failure so the UI can message it precisely (code-based, not message).
      if (code === "DELETE_WINDOW_EXPIRED") {
        return fail({ type: "delete-window-expired" });
      }
      return fail({
        type: "delete-message-failed",
        cause: code ?? "social-service-not-available",
      });
    }
  }

  async createConversation(
    contactIds: string[],
    name?: string,
  ): Promise<Result<ConversationEntity, MessagingFailure>> {
    // Only the 1:1 case has a real contract (find-or-create SCHOOL DM). A
    // multi-party ad hoc group has NO real endpoint (ADR 0060) — fail without
    // an HTTP call; this is genuinely unsupported, not a transient error.
    if (contactIds.length !== 1) {
      return fail({
        type: "create-conversation-failed",
        cause: "group-not-supported-by-real-contract",
      });
    }
    try {
      const dto = (await this.http.post(MESSAGING_EP.schoolDms, {
        targetUserId: contactIds[0],
      })) as unknown as SchoolDmResponseDto;
      // Synthesize a minimal conversation from the DM response — cheaper than a
      // follow-up GET /rooms/{id}, and CreateConversationUseCase only needs a
      // ConversationEntity to hand back to the client, which then refetches.
      return ok({
        id: dto.roomId,
        type: "direct",
        name: name ?? "",
        avatarInitials: "?",
        color: "primary",
        lastMessage: "",
        lastMessageTime: "",
        unreadCount: 0,
      });
    } catch (err) {
      return fail({
        type: "create-conversation-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async markConversationRead(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.post(MESSAGING_EP.roomRead(conversationId));
      return ok(true);
    } catch (err) {
      return fail({
        type: "mark-read-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async sendTypingIndicator(
    conversationId: string,
    typing: boolean,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.post(MESSAGING_EP.roomTyping(conversationId), { typing });
      return ok(true);
    } catch (err) {
      // Includes the ~3s-cooldown 429 — mapped to a normal Result, NEVER
      // thrown; the presentation call site swallows it.
      return fail({
        type: "typing-signal-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  // --- Permanently unsupported by the real contract (ADR 0060) ---
  // These have no real endpoint; return an explicit fail so they can never
  // silently succeed against a non-existent contract. The DI factory
  // force-mocks them, so real mode still serves their mock behavior.

  private readonly unsupported: MessagingFailure = {
    type: "group-mutation-failed",
    cause: "not-supported-by-real-contract",
  };

  async getContacts(): Promise<Result<ContactEntity[], MessagingFailure>> {
    return fail({
      type: "load-conversations-failed",
      cause: "not-supported-by-real-contract",
    });
  }

  async createGroup(
    _input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return fail({
      type: "create-group-failed",
      cause: "not-supported-by-real-contract",
    });
  }

  async getGroup(
    _groupId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return fail(this.unsupported);
  }

  async updateGroup(
    _input: UpdateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return fail(this.unsupported);
  }

  async addGroupMembers(
    _groupId: string,
    _memberIds: string[],
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return fail(this.unsupported);
  }

  async removeGroupMember(
    _groupId: string,
    _userId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    return fail(this.unsupported);
  }

  async leaveGroup(
    _conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return fail({
      type: "leave-group-failed",
      cause: "not-supported-by-real-contract",
    });
  }

  async deleteGroup(
    _groupId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return fail(this.unsupported);
  }

  async pinMessage(
    _conversationId: string,
    _messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return fail({
      type: "pin-failed",
      cause: "not-supported-by-real-contract",
    });
  }

  async unpinMessage(
    _conversationId: string,
    _messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    return fail({
      type: "pin-failed",
      cause: "not-supported-by-real-contract",
    });
  }
}
