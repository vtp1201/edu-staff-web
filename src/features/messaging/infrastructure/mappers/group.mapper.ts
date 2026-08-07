import type {
  GroupEntity,
  GroupMember,
  PinnedMessage,
} from "@/features/messaging/domain/entities/group.entity";
import type { CreateGroupRoomResponseDto } from "../dtos/create-group-room-response.dto";
import type { GroupMemberResponseDto } from "../dtos/group-member-response.dto";
import type { GroupResponseDto } from "../dtos/group-response.dto";
import type { PinnedMessageResponseDto } from "../dtos/pinned-message-response.dto";
import { roomColorKey } from "./room-derive";

export function toGroupMember(dto: GroupMemberResponseDto): GroupMember {
  return {
    userId: dto.userId,
    name: dto.name,
    initials: dto.initials,
    color: dto.color,
    role: dto.role,
    isOnline: dto.isOnline,
    // US-E10.6 — additive presence passthrough (undefined when absent on wire).
    presence: dto.presence,
    lastActiveAt: dto.lastActiveAt,
  };
}

export function toPinnedMessage(dto: PinnedMessageResponseDto): PinnedMessage {
  return {
    messageId: dto.messageId,
    senderId: dto.senderId,
    senderName: dto.senderName,
    excerpt: dto.excerpt,
    sentAt: dto.sentAt,
  };
}

/**
 * US-E18.50 / BE US-193 (ADR 0132) — map the `POST /rooms/groups` 201 payload
 * onto a `GroupEntity`. Three of the entity's fields have NO column on the real
 * wire, so each is handled explicitly rather than faked:
 *
 * - `description` → `""`. The BE `Room` entity has no description at all
 *   (`room_request.go`: "The Room entity has no description field").
 * - `kind` → `"other"`. The wire's `roomType` is always `custom` for a
 *   self-service group; `other` is the entity's matching neutral bucket. It is
 *   NOT a user choice any more (the create form no longer collects one).
 * - `color` → derived deterministically from the room id via the same 7-tone
 *   `roomColorKey` rotation the conversation list already uses, so the group
 *   avatar looks identical across renders/requests. A semantic tone KEY, never
 *   a raw colour.
 *
 * `members` stays EMPTY on purpose. The contract seeds the caller as the room
 * OWNER, but the 201 echoes no membership and the wire carries no display name
 * for the caller — synthesizing a member row here would be fiction dressed as a
 * server fact. "The caller is a member" is a client-side INFERENCE from the
 * contract; the next room-detail read is the only server-confirmed member list.
 */
export function toGroupEntityFromCreatedRoom(
  dto: CreateGroupRoomResponseDto,
): GroupEntity {
  return {
    id: dto.roomId,
    name: dto.name,
    description: "",
    kind: "other",
    color: roomColorKey(dto.roomId),
    conversationId: dto.roomId,
    members: [],
    pinnedMessages: [],
  };
}

export function toGroupEntity(dto: GroupResponseDto): GroupEntity {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    kind: dto.kind,
    color: dto.color,
    conversationId: dto.conversationId,
    members: dto.members.map(toGroupMember),
    pinnedMessages: dto.pinnedMessages.map(toPinnedMessage),
  };
}
