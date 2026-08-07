import type { GroupKind } from "@/features/messaging/domain/entities/group.entity";
import type { GroupMemberResponseDto } from "./group-member-response.dto";

/**
 * Wire shape for a group (INT-001/INT-002/INT-003). All fields camelCase.
 *
 * US-E18.51: `pinnedMessages` was REMOVED. The real contract has no group-detail
 * endpoint that embeds a pin board — pins are their own resource
 * (`GET /rooms/{roomId}/pinned-messages`, `PinnedMessageResponseDto`).
 */
export type GroupResponseDto = {
  id: string;
  name: string;
  description: string;
  kind: GroupKind;
  color: string;
  conversationId: string;
  members: GroupMemberResponseDto[];
};
