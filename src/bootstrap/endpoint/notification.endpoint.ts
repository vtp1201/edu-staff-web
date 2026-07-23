/**
 * Notification (noti) service HTTP endpoints (US-E10.2).
 * Kong-prefixed `/noti/api/v1/*` (same convention as ANNOUNCEMENTS_EP).
 *
 * US-E18.18 — the notification `cmd/server` shipped a real per-room
 * `unread-counts` endpoint (ground-truthed). `list`/`unreadCount` (singular)/
 * `markRead`/`markAllRead` have NO real backing (confirmed no endpoint exists);
 * they stay force-mocked via `HybridNotificationRepository`.
 */
export const NOTIFICATION_EP = {
  /** GET — cursor-paged list of notifications (MOCK-ONLY: no real endpoint). */
  list: "/noti/api/v1/notifications",
  /** GET — legacy singular unread count (MOCK-ONLY: no real endpoint). */
  unreadCount: "/noti/api/v1/notifications/unread-count",
  /**
   * GET — REAL per-room unread message counts (US-E18.18). Returns
   * `{ roomId, unreadCount }[]` (enveloped; the interceptor unwraps to the
   * array). Optional comma-separated `roomIds` filter; omit for all rooms.
   * Reused by both `NotificationRepository.getUnreadCount` (sum, no filter) and
   * `MessagingRepository.getConversations` (per-room enrichment, filtered).
   */
  unreadCounts: (roomIds?: string[]) =>
    roomIds && roomIds.length > 0
      ? `/noti/api/v1/notifications/unread-counts?roomIds=${roomIds.join(",")}`
      : "/noti/api/v1/notifications/unread-counts",
  /** PATCH — mark a single notification as read (MOCK-ONLY: no real endpoint). */
  markRead: (id: string) => `/noti/api/v1/notifications/${id}/read`,
  /** PATCH — mark ALL unread as read, batch (MOCK-ONLY: no real endpoint). */
  markAllRead: "/noti/api/v1/notifications/read-batch",
} as const;

/** Wire shape of one `unread-counts` row (US-E18.18, camelCase). */
export type RoomUnreadCountDto = { roomId: string; unreadCount: number };
