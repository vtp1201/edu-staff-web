/**
 * Notification (noti) service HTTP endpoints (US-E10.2).
 * Kong-prefixed `/noti/api/v1/*` (same convention as ANNOUNCEMENTS_EP).
 *
 * US-E18.18 — the notification `cmd/server` shipped a real per-room
 * `unread-counts` endpoint (PLURAL, a messaging concept).
 *
 * US-E18.25 (BE US-146, ADR 0066) — the real per-user notification inbox
 * shipped: `list`, `unreadCount` (SINGULAR, generic), `markRead` and
 * `markAllRead` all have real backing now, so the force-mock facade
 * (`HybridNotificationRepository`) was retired.
 */
export const NOTIFICATION_EP = {
  /**
   * GET — REAL cursor-paged notification inbox (US-E18.25 / BE US-146).
   * Query params: `type` (grade|attendance|discipline|announcement|system),
   * `cursor`, `limit` (1–100, default 20). There is NO `unread`/`read` filter
   * — the "Unread" tab drains client-side (ADR 0066, cross-repo ask #42).
   * Enveloped with `meta.pagination.{nextCursor,hasMore}` → call with
   * `{ raw: true }` + `parseEnvelope()`.
   */
  list: "/noti/api/v1/notifications",
  /**
   * GET — REAL GENERIC unread count (US-E18.25 / BE US-146). Returns
   * `{ count }` (exact COUNT(*) over the caller's own inbox). Deliberately
   * distinct from `unreadCounts` (PLURAL) below, which is the per-room
   * messaging concept — do not confuse the two.
   */
  unreadCount: "/noti/api/v1/notifications/unread-count",
  /**
   * GET — REAL per-room unread message counts (US-E18.18). Returns
   * `{ roomId, unreadCount }[]` (enveloped; the interceptor unwraps to the
   * array). Optional comma-separated `roomIds` filter; omit for all rooms.
   * Consumed ONLY by `MessagingRepository.getConversations` (per-room
   * enrichment, filtered). US-E18.25 moved `NotificationRepository
   * .getUnreadCount` off this endpoint onto the generic singular
   * `unreadCount` above.
   */
  unreadCounts: (roomIds?: string[]) =>
    roomIds && roomIds.length > 0
      ? `/noti/api/v1/notifications/unread-counts?roomIds=${roomIds.join(",")}`
      : "/noti/api/v1/notifications/unread-counts",
  /**
   * PATCH — REAL mark a single notification as read (US-E18.25 / BE US-146).
   * 204 no body, idempotent; 404 `NOTIFICATION_NOT_FOUND` when the id is not
   * in the caller's own partition (or is not a v1 UUID).
   */
  markRead: (id: string) => `/noti/api/v1/notifications/${id}/read`,
  /**
   * PATCH — REAL mark-all-read, no request body (US-E18.25 / BE US-146).
   * Returns `{ markedCount, hasMore }` and is CAPPED AT 500 ROWS per call —
   * the caller MUST repeat while `hasMore === true` (see
   * `NotificationRepository.markAllRead`'s bounded loop).
   */
  markAllRead: "/noti/api/v1/notifications/read-batch",
} as const;

/** Wire shape of one `unread-counts` row (US-E18.18, camelCase). */
export type RoomUnreadCountDto = { roomId: string; unreadCount: number };
