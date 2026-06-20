import type { GroupKind } from "@/features/messaging/domain/entities/group.entity";
import type { GroupMemberResponseDto } from "./group-member-response.dto";
import type { PinnedMessageResponseDto } from "./pinned-message-response.dto";

/** Wire shape for a group (INT-001/INT-002/INT-003). All fields camelCase. */
export type GroupResponseDto = {
  id: string;
  name: string;
  description: string;
  kind: GroupKind;
  color: string;
  conversationId: string;
  members: GroupMemberResponseDto[];
  pinnedMessages: PinnedMessageResponseDto[];
};
