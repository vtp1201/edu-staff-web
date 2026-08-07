/**
 * `social` service endpoints. The room/message/read/typing/school-dm paths are
 * ground-truthed against `edu-api/services/social/docs/openapi.yaml` (US-E18.17,
 * ADR 0060) and share the `/social/api/v1/...` prefix convention already used by
 * `MODERATION_EP`/`FEED_EP`. No magic strings in repositories.
 *
 * US-E18.50 (BE US-193, ADR 0132) added exactly TWO self-service group-room
 * paths — `groups` (create) and `roomArchive` (soft-delete). The REST of the
 * group-lifecycle slice (read a group with named members, rename, add/remove
 * members, self-leave) still has no usable contract, keeps its mock service,
 * and gets no constants here — there is nothing for it to point at. Same for
 * the contacts-directory and message-pin flows (ADR 0060).
 */
export const MESSAGING_EP = {
  /** List rooms: `GET ?userId=<self>` (create is worker/provisioned, not used by web). */
  rooms: "/social/api/v1/rooms",
  /** US-193: create a self-service `custom` group room; body is `{name}` ONLY. */
  groups: "/social/api/v1/rooms/groups",
  /** US-193: soft-archive a self-service (`custom`) group room; no body → 204. */
  roomArchive: (roomId: string) => `/social/api/v1/rooms/${roomId}/archive`,
  roomMessages: (roomId: string) => `/social/api/v1/rooms/${roomId}/messages`,
  roomMessageById: (roomId: string, messageId: string) =>
    `/social/api/v1/rooms/${roomId}/messages/${messageId}`,
  roomRead: (roomId: string) => `/social/api/v1/rooms/${roomId}/read`,
  roomTyping: (roomId: string) => `/social/api/v1/rooms/${roomId}/typing`,
  schoolDms: "/social/api/v1/rooms/school-dms",
} as const;
