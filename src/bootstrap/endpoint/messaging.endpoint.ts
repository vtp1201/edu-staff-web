/**
 * `social` service endpoints. The room/message/read/typing/school-dm paths are
 * ground-truthed against `edu-api/services/social/docs/openapi.yaml` (US-E18.17,
 * ADR 0060) and share the `/social/api/v1/...` prefix convention already used by
 * `MODERATION_EP`/`FEED_EP`. No magic strings in repositories.
 *
 * The `groups`/`contacts`/`pin`/`leave` constants below have NO real contract
 * (ADR 0060) — they stay wired to the mock repository permanently; kept here for
 * that mock-mode wiring, not used by the real repository.
 */
export const MESSAGING_EP = {
  // --- US-E18.17 real rooms/messages/read/typing/school-dms ---
  /** List rooms: `GET ?userId=<self>` (create is worker/provisioned, not used by web). */
  rooms: "/social/api/v1/rooms",
  roomMessages: (roomId: string) => `/social/api/v1/rooms/${roomId}/messages`,
  roomMessageById: (roomId: string, messageId: string) =>
    `/social/api/v1/rooms/${roomId}/messages/${messageId}`,
  roomRead: (roomId: string) => `/social/api/v1/rooms/${roomId}/read`,
  roomTyping: (roomId: string) => `/social/api/v1/rooms/${roomId}/typing`,
  schoolDms: "/social/api/v1/rooms/school-dms",

  // --- Permanently mock (ADR 0060): no real self-service contract exists ---
  contacts: "/social/api/v1/contacts",
  groups: "/social/api/v1/groups",
  groupById: (groupId: string) => `/social/api/v1/groups/${groupId}`,
  groupMembers: (groupId: string) => `/social/api/v1/groups/${groupId}/members`,
  groupMemberById: (groupId: string, userId: string) =>
    `/social/api/v1/groups/${groupId}/members/${userId}`,
  conversationLeave: (conversationId: string) =>
    `/social/api/v1/conversations/${conversationId}/leave`,
  messagePin: (conversationId: string, messageId: string) =>
    `/social/api/v1/conversations/${conversationId}/messages/${messageId}/pin`,
} as const;
