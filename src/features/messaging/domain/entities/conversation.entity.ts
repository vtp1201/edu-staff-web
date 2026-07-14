/**
 * A conversation in the messaging inbox — either a 1:1 direct chat or a group.
 * `color` is a semantic token name (e.g. "primary", "success") resolved to a
 * Tailwind class at the presentation boundary — never a raw hex.
 */
import type { PresenceState } from "./presence";

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
  /** Direct only — whether the other participant is online (legacy boolean). */
  isOnline?: boolean;
  /** Direct only — US-E10.6 3-state presence (additive; derived via msgPresence). */
  presence?: PresenceState;
  /** Direct only — US-E10.6 coarse minute/day bucket of last activity. */
  lastActiveAt?: string;
  /** Group only — member count. */
  memberCount?: number;
  /** Group only — name of the last message sender for "Sender: preview…" (US-E10.4). */
  lastSenderName?: string;
  /** Group only — whether the current user is an admin of this group (US-E10.4). */
  selfIsGroupAdmin?: boolean;
};
