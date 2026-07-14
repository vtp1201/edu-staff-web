import type {
  GroupEntity,
  GroupMember,
  PinnedMessage,
} from "@/features/messaging/domain/entities/group.entity";
import type { GroupMemberResponseDto } from "../dtos/group-member-response.dto";
import type { GroupResponseDto } from "../dtos/group-response.dto";
import type { PinnedMessageResponseDto } from "../dtos/pinned-message-response.dto";

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
