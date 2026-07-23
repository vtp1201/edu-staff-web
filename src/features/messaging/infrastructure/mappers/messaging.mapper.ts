import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { PresenceRecord } from "@/features/messaging/domain/entities/presence";
import type { ContactResponseDto } from "../dtos/contact-response.dto";
import type { ConversationResponseDto } from "../dtos/conversation-response.dto";
import type { MessageResponseDto } from "../dtos/message-response.dto";
import type { PresenceResponseDto } from "../dtos/presence-response.dto";
import type { RoomMessageResponseDto } from "../dtos/room-message-response.dto";
import type { RoomSummaryResponseDto } from "../dtos/room-summary-response.dto";
import { formatWireTimestamp, roomColorKey, roomInitials } from "./room-derive";

export function toConversationEntity(
  dto: ConversationResponseDto,
): ConversationEntity {
  return {
    id: dto.id,
    type: dto.type === "group" ? "group" : "direct",
    name: dto.name,
    avatarInitials: dto.avatarInitials,
    color: dto.color,
    lastMessage: dto.lastMessage,
    lastMessageTime: dto.lastMessageTime,
    unreadCount: dto.unreadCount,
    isOnline: dto.isOnline,
    memberCount: dto.memberCount,
    // US-E10.6 — additive presence passthrough (undefined when absent on wire).
    presence: dto.presence,
    lastActiveAt: dto.lastActiveAt,
  };
}

export function toMessageEntity(dto: MessageResponseDto): MessageEntity {
  return {
    id: dto.id,
    conversationId: dto.conversationId,
    from: dto.from,
    text: dto.text,
    time: dto.time,
    date: dto.date,
    senderName: dto.senderName,
    senderInitials: dto.senderInitials,
    senderColor: dto.senderColor,
  };
}

// --- US-E18.17 real `social` room/message → domain (ADR 0060) ---

/**
 * Map a real `RoomSummary` (rooms endpoint) to a `ConversationEntity`. The real
 * schema carries NO unread-count and NO avatar/colour — `avatarInitials`/`color`
 * are derived deterministically from name/roomId; `unreadCount` seeds to 0 and
 * is enriched from the real per-room `unread-counts` endpoint by the repository.
 */
export function toConversationEntityFromRoom(
  dto: RoomSummaryResponseDto,
): ConversationEntity {
  return {
    id: dto.roomId,
    type: dto.roomType === "dm" ? "direct" : "group",
    name: dto.name,
    avatarInitials: roomInitials(dto.name),
    color: roomColorKey(dto.roomId),
    lastMessage: dto.lastMessagePreview ?? "",
    lastMessageTime: formatWireTimestamp(dto.lastMessageAt).time,
    // US-E18.18 closes ADR 0060 ask #32(a): RoomSummary still has no unread field
    // on the wire, so this seeds to 0; `MessagingRepository.getConversations`
    // best-effort merges the real count from `GET /notifications/unread-counts`.
    unreadCount: 0,
  };
}

/**
 * Map a real `Message` to a `MessageEntity`. `from` is `me` only when the
 * sender matches the server-resolved current user (never `system` — the wire
 * has no such concept). `senderName`/`senderInitials`/`senderColor` have no
 * wire source and stay undefined (the chat bubble renders that case). Deleted
 * messages carry the i18n key as `text`; the bubble ignores it when isDeleted.
 */
export function toMessageEntityFromRoom(
  dto: RoomMessageResponseDto,
  currentUserId: string | null,
): MessageEntity {
  const { time, date } = formatWireTimestamp(dto.createdAt);
  return {
    id: dto.messageId,
    conversationId: dto.roomId,
    from: currentUserId && dto.senderUserId === currentUserId ? "me" : "other",
    text: dto.text,
    time,
    date,
    isDeleted: dto.status === "deleted",
    sentAt: dto.createdAt,
  };
}

export function toContactEntity(dto: ContactResponseDto): ContactEntity {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    avatarInitials: dto.avatarInitials,
    color: dto.color,
    isOnline: dto.isOnline,
    // US-E10.6 — additive presence passthrough (undefined when absent on wire).
    presence: dto.presence,
    lastActiveAt: dto.lastActiveAt,
  };
}

/**
 * How recent a `lastSeen` must be (ms) to count as `recent` rather than
 * `offline`. No product/design-spec value exists for this — 5 minutes is a sane
 * documented default (flagged as an open product question, US-E18.18).
 */
export const PRESENCE_RECENT_WINDOW_MS = 5 * 60 * 1000;

/**
 * US-E18.18 — map the real 2-state presence wire (`{userId, online, lastSeen}`)
 * to the domain's existing 3-state `PresenceRecord` (zero VM/UI change).
 * `online` → `"online"`; otherwise `recent` when `lastSeen` is within
 * `PRESENCE_RECENT_WINDOW_MS` of `nowMs`, else `offline`. `nowMs` is injected
 * (never `Date.now()` inside the mapper) so the derivation is deterministic
 * under test (`.claude/rules/tdd.md`).
 */
export function toPresenceRecord(
  dto: PresenceResponseDto,
  nowMs: number,
): PresenceRecord {
  let presence: PresenceRecord["presence"] = "offline";
  if (dto.online) {
    presence = "online";
  } else if (dto.lastSeen) {
    const seenMs = Date.parse(dto.lastSeen);
    if (!Number.isNaN(seenMs) && nowMs - seenMs <= PRESENCE_RECENT_WINDOW_MS) {
      presence = "recent";
    }
  }
  return {
    memberId: dto.userId,
    presence,
    lastActiveAt: dto.lastSeen ?? "",
  };
}
