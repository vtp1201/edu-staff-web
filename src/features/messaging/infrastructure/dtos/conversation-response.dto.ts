import type { ConversationType } from "@/features/messaging/domain/entities/conversation.entity";

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
};
