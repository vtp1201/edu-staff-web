import type { ConversationType } from "@/features/messaging/domain/entities/conversation.entity";
import type { PresenceState } from "@/features/messaging/domain/entities/presence";

/** Wire shape for a conversation (camelCase per api-integration rule). */
export type ConversationResponseDto = {
  id: string;
  type: ConversationType;
  name: string;
  avatarInitials: string;
  color: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
  memberCount?: number;
  /** US-E10.6 — direct-only additive 3-state presence. */
  presence?: PresenceState;
  /** US-E10.6 — coarse minute/day bucket of last activity. */
  lastActiveAt?: string;
};
