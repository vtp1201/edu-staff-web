/**
 * A conversation in the messaging inbox — either a 1:1 direct chat or a group.
 * `color` is a semantic token name (e.g. "primary", "success") resolved to a
 * Tailwind class at the presentation boundary — never a raw hex.
 */
export type ConversationType = "direct" | "group";

export type ConversationEntity = {
  id: string;
  type: ConversationType;
  name: string;
  avatarInitials: string;
  /** Semantic colour key (primary | success | warning | error | info | purple | teal). */
  color: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  /** Direct only — whether the other participant is online. */
  isOnline?: boolean;
  /** Group only — member count. */
  memberCount?: number;
};
