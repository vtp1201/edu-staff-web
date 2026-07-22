/**
 * `social` service endpoints. The room/message/read/typing/school-dm paths are
 * ground-truthed against `edu-api/services/social/docs/openapi.yaml` (US-E18.17,
 * ADR 0060) and share the `/social/api/v1/...` prefix convention already used by
 * `MODERATION_EP`/`FEED_EP`. No magic strings in repositories.
 *
 * The group lifecycle / contacts-directory / message-pin flows have NO real
 * contract (ADR 0060) — `MockMessagingRepository` serves them with in-memory
 * fixtures and never reads endpoint constants for them, and the real
 * `MessagingRepository` returns an explicit fail Result without any HTTP call
 * (see its "Permanently unsupported" section) — so no constants for those
 * flows are kept here; there is nothing for them to point at.
 */
export const MESSAGING_EP = {
  /** List rooms: `GET ?userId=<self>` (create is worker/provisioned, not used by web). */
  rooms: "/social/api/v1/rooms",
  roomMessages: (roomId: string) => `/social/api/v1/rooms/${roomId}/messages`,
  roomMessageById: (roomId: string, messageId: string) =>
    `/social/api/v1/rooms/${roomId}/messages/${messageId}`,
  roomRead: (roomId: string) => `/social/api/v1/rooms/${roomId}/read`,
  roomTyping: (roomId: string) => `/social/api/v1/rooms/${roomId}/typing`,
  schoolDms: "/social/api/v1/rooms/school-dms",
} as const;
