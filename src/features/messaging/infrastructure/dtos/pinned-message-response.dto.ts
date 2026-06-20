/** Wire shape for a pinned message (INT-002). All fields camelCase. */
export type PinnedMessageResponseDto = {
  messageId: string;
  senderId: string;
  senderName: string;
  excerpt: string;
  /** ISO8601. */
  sentAt: string;
};
