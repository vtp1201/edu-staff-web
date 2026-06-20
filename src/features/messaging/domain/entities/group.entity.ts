/**
 * Group lifecycle entities (US-E10.4). A group is the social-service backing
 * object for a `type: "group"` conversation; `conversationId` links it to the
 * `ConversationEntity` shown in the inbox. Colour values are semantic token
 * keys (or a hex from the 8-swatch create palette) — never resolved here.
 */
export type GroupKind = "class" | "dept" | "club" | "other";

export type GroupMember = {
  userId: string;
  name: string;
  initials: string;
  /** Semantic color key (primary | success | warning | error | info | purple | teal). */
  color: string;
  role: "admin" | "member";
  isOnline: boolean;
};

export type PinnedMessage = {
  messageId: string;
  senderId: string;
  senderName: string;
  excerpt: string;
  /** ISO8601 timestamp. */
  sentAt: string;
};

export type GroupEntity = {
  id: string;
  name: string;
  description: string;
  kind: GroupKind;
  /** Semantic color key or hex from the 8-swatch palette. */
  color: string;
  conversationId: string;
  members: GroupMember[];
  pinnedMessages: PinnedMessage[];
};
