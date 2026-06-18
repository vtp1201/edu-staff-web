import type { MessageOrigin } from "@/features/messaging/domain/entities/message.entity";

/** Wire shape for a single message (camelCase). */
export type MessageResponseDto = {
  id: string;
  conversationId: string;
  from: MessageOrigin;
  text: string;
  time: string;
  date: string;
  senderName?: string;
  senderInitials?: string;
  senderColor?: string;
};
