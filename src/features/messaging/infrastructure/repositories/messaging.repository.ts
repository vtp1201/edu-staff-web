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
import type { PinnedMessage } from "@/features/messaging/domain/entities/pinned-message.entity";
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
import type { CreateGroupRoomResponseDto } from "../dtos/create-group-room-response.dto";
import type { PinnedMessageResponseDto } from "../dtos/pinned-message-response.dto";
import type { RoomMessageResponseDto } from "../dtos/room-message-response.dto";
import type { RoomSummaryResponseDto } from "../dtos/room-summary-response.dto";
import type { SchoolDmResponseDto } from "../dtos/school-dm-response.dto";
import { toGroupEntityFromCreatedRoom } from "../mappers/group.mapper";
import {
  toConversationEntityFromRoom,
  toMessageEntityFromRoom,
} from "../mappers/messaging.mapper";
import { toPinnedMessages } from "../mappers/pinned-message.mapper";

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
 * US-E18.50 (BE US-193, ADR 0132) made TWO of the seven group-lifecycle methods
 * real: `createGroup` (`POST /rooms/groups`) and `deleteGroup` (mapped to
 * `POST /rooms/{roomId}/archive`). The other five group methods, plus the
 * contacts methods, still have no real contract (message-pin is REAL since
 * US-E18.51); they return a
 * fail Result with a `not-supported-by-real-contract` cause here (never a
 * doomed HTTP call), and the hybrid facade force-mocks them so those flows keep
 * their mock behavior unchanged. See the per-method notes further down for WHY
 * each one is still unsupported — "US-193 shipped group rooms" is not the same
 * statement as "the group slice is now real".
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

  // --- US-E18.50 / BE US-193 (ADR 0132): the self-service group-room slice ---
  // Exactly TWO of the seven group-lifecycle methods have a real contract.

  /**
   * `POST /rooms/groups` (201). The body is `{name}` and nothing else — creator
   * and tenant come from the verified Gateway claims, so sending them would be
   * both useless and a spoofing surface. The role allow-list
   * (ADMIN/MANAGER/TEACHER/STAFF) is enforced server-side; the UI additionally
   * hides the affordance for STUDENT/PARENT, and the 403 branch below is the
   * defense-in-depth half of that pair.
   */
  async createGroup(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.post(MESSAGING_EP.groups, {
        name: input.name,
      })) as unknown as CreateGroupRoomResponseDto;
      return ok(toGroupEntityFromCreatedRoom(dto));
    } catch (err) {
      const code = errorCodeOf(err);
      if (code === "SOCIAL_GROUP_ROOM_CREATION_FORBIDDEN") {
        return fail({ type: "create-group-forbidden" });
      }
      return fail({
        type: "create-group-failed",
        cause: code ?? "social-service-not-available",
      });
    }
  }

  /**
   * `POST /rooms/{roomId}/archive` (204). The real contract's "delete" for a
   * self-service group is a soft ARCHIVE (history retained; new sends rejected
   * by the pre-existing `ROOM_ARCHIVED` guard, which is not reachable from this
   * path). Mapped onto the existing `deleteGroup` domain method instead of
   * renaming it: the UI affordance and the `boolean` Result shape are
   * unchanged, so this stays the smallest honest diff. Idempotent server-side —
   * re-archiving returns 204, so there is no client-side "already archived"
   * special case to write.
   */
  async deleteGroup(
    groupId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.post(MESSAGING_EP.roomArchive(groupId));
      return ok(true);
    } catch (err) {
      const code = errorCodeOf(err);
      // 409: a system-provisioned room (class_chat/parent_group) is not
      // archivable through this path — a permanent, explainable state, NOT a
      // generic "please try again" error.
      if (code === "SOCIAL_ROOM_NOT_SELF_SERVICE") {
        return fail({ type: "group-not-self-service" });
      }
      // 403: a member without the OWNER-only `delete_room` capability (0065).
      if (code === "SOCIAL_INSUFFICIENT_ROOM_PERMISSION") {
        return fail({ type: "not-group-admin" });
      }
      return fail({
        type: "group-mutation-failed",
        cause: code ?? "social-service-not-available",
      });
    }
  }

  // --- US-E18.51 message pin / unpin / pin board (BE US-192) ---

  /**
   * Pin a message. No request body — the Go handler builds its input from the
   * path params plus `actorFrom(c)` (JWT). The 201 payload
   * (`{messageId, pinnedBy, pinnedAt}`) carries nothing the caller needs (the
   * board is refetched), so it is discarded.
   */
  async pinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.post(
        MESSAGING_EP.roomMessagePin(conversationId, messageId),
      );
      return ok(true);
    } catch (err) {
      return fail(toPinFailure(err));
    }
  }

  /** Unpin (204). Same `moderate_msg` gate as pin — not limited to the pinner. */
  async unpinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.delete(
        MESSAGING_EP.roomMessagePin(conversationId, messageId),
      );
      return ok(true);
    } catch (err) {
      return fail(toPinFailure(err));
    }
  }

  /**
   * The room's pin board. Enveloped but NOT paginated (bounded by the 50-pin
   * cap), so the interceptor's unwrap gives the array directly — no
   * `{ raw: true }` / `parseEnvelope` here, unlike message history.
   *
   * Read access is membership-only, so a 403 here is NOT `pin-forbidden`
   * (that key means "lacks moderate_msg"); it stays a load failure carrying the
   * wire code, exactly like the message-history read this endpoint shares its
   * 120/min quota with (429 `SOCIAL_READ_RATE_LIMITED`).
   */
  async getPinnedMessages(
    conversationId: string,
  ): Promise<Result<PinnedMessage[], MessagingFailure>> {
    try {
      const rows = (await this.http.get(
        MESSAGING_EP.roomPinnedMessages(conversationId),
      )) as unknown as PinnedMessageResponseDto[] | null;
      return ok(toPinnedMessages(rows ?? []));
    } catch (err) {
      return fail({
        type: "load-pinned-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  // --- Still unsupported by the real contract (ADR 0060, re-verified per
  // method for US-E18.50 against `services/social/docs/openapi.yaml` and the
  // Go handlers at BE US-193) ---
  // These five have no usable real endpoint; they return an explicit fail so
  // they can never silently succeed against a non-existent contract, and the
  // hybrid facade force-mocks them so real mode keeps their mock behavior:
  //
  // - getGroup / addGroupMembers / removeGroupMember — a room-member surface
  //   (`GET|POST /rooms/{id}/members`, `DELETE /rooms/{id}/members/{userId}`)
  //   DOES exist, but all three of these methods return a full `GroupEntity`,
  //   which needs per-member display names (`RoomMember` carries userId /
  //   roomRole / joinedAt only) plus description/kind/colour that no room
  //   endpoint has. Wiring them means a 3-call fan-out (detail + members +
  //   profile directory) AND an entity reshape — a separate story, not a swap.
  // - updateGroup — there is NO `PATCH`/`PUT /rooms/{roomId}` at all; a room's
  //   name cannot be edited through the public contract.
  // - leaveGroup — `DELETE /rooms/{id}/members/{self}` does permit self-leave
  //   (ADR 0094 capability bypass) and the `boolean` shape would fit, but
  //   unlike archive it is NOT scoped to `custom` rooms: wiring it would let a
  //   member leave a system-provisioned class_chat with no re-provisioning
  //   contract, and the retained sole-OWNER guard (every self-service creator
  //   IS the sole OWNER) needs its own failure + copy. Flagged to fe-lead as a
  //   follow-up rather than silently enabled here.

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
}

/**
 * US-E18.51 — shared pin/unpin error mapping. Branches on the UPPER_SNAKE wire
 * CODE (never the message, never the status alone): the two 409s mean different
 * things to the user, and 403 covers both "not a member" and "member without
 * `moderate_msg`" — both are the same dead end for the actor.
 */
function toPinFailure(err: unknown): MessagingFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "SOCIAL_PIN_LIMIT_REACHED":
      return { type: "pin-limit-reached" };
    case "SOCIAL_MESSAGE_ALREADY_PINNED":
      return { type: "message-already-pinned" };
    case "SOCIAL_MESSAGE_NOT_PINNED":
      return { type: "message-not-pinned" };
    case "SOCIAL_INSUFFICIENT_ROOM_PERMISSION":
    case "ROOM_NOT_MEMBER":
      return { type: "pin-forbidden" };
    default:
      return {
        type: "pin-failed",
        cause: code ?? "social-service-not-available",
      };
  }
}
