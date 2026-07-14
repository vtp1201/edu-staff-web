/**
 * Group lifecycle entities (US-E10.4). A group is the social-service backing
 * object for a `type: "group"` conversation; `conversationId` links it to the
 * `ConversationEntity` shown in the inbox. Colour values are semantic token
 * keys (or a hex from the 8-swatch create palette) — never resolved here.
 */
import type { PresenceState } from "./presence";

export type GroupKind = "class" | "dept" | "club" | "other";

export type GroupMember = {
  userId: string;
  name: string;
  initials: string;
  /** Semantic color key (primary | success | warning | error | info | purple | teal). */
  color: string;
  role: "admin" | "member";
  isOnline: boolean;
  /** US-E10.6 — 3-state presence (additive; `isOnline` stays as the fallback). */
  presence?: PresenceState;
  /** US-E10.6 — coarse minute/day bucket of last activity (never precise). */
  lastActiveAt?: string;
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
