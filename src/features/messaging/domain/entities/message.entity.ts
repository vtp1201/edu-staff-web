/**
 * A single message inside a conversation. `from` distinguishes own messages
 * (right-aligned, primary bubble) from others (left, card bubble) and system
 * notices (centered, italic). `date` is the human label used for date dividers
 * ("Hôm nay", "Hôm qua", "dd/mm/yyyy").
 */
export type MessageOrigin = "me" | "other" | "system";

export type MessageEntity = {
  id: string;
  conversationId: string;
  from: MessageOrigin;
  text: string;
  time: string;
  date: string;
  /** Group "other" messages — sender display name. */
  senderName?: string;
  senderInitials?: string;
  /** Semantic colour key for the sender avatar. */
  senderColor?: string;
  /** Optimistic UI flag — true while the send mutation is in flight. */
  isPending?: boolean;
  /** Reply quote (US-E10.4) — set when this message replies to another. */
  replyTo?: {
    messageId: string;
    senderName: string;
    excerpt: string;
  };
  /** Pinned in the group info panel (US-E10.4). */
  isPinned?: boolean;
  /** Soft-deleted — bubble renders the "Tin nhắn đã bị xoá" placeholder (US-E10.4). */
  isDeleted?: boolean;
  /** ISO8601 timestamp for the delete-window check (isMine && within 5 minutes). */
  sentAt?: string;
};
