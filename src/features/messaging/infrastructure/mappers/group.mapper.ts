import type {
  GroupEntity,
  GroupMember,
} from "@/features/messaging/domain/entities/group.entity";
import type { GroupMemberResponseDto } from "../dtos/group-member-response.dto";
import type { GroupResponseDto } from "../dtos/group-response.dto";

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

/**
 * US-E18.51 — the pin board moved OUT of the group entity (its own resource on
 * the real contract); `toPinnedMessages` now lives in `pinned-message.mapper.ts`.
 */
export function toGroupEntity(dto: GroupResponseDto): GroupEntity {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    kind: dto.kind,
    color: dto.color,
    conversationId: dto.conversationId,
    members: dto.members.map(toGroupMember),
  };
}
