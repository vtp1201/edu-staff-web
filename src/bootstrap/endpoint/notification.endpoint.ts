/**
 * Notification (noti) service HTTP endpoints (US-E10.2).
 * Mock-first: `noti` service is not yet shipped (decision 0017).
 * These paths will be consumed by NotificationRepository once the service ships.
 */
export const NOTIFICATION_EP = {
  /** GET — cursor-paged list of notifications for the current user. */
  list: "/noti/api/v1/notifications",
  /** GET — current unread notification count for the current user. */
  unreadCount: "/noti/api/v1/notifications/unread-count",
  /** PATCH — mark a single notification as read. */
  markRead: (id: string) => `/noti/api/v1/notifications/${id}/read`,
  /** PATCH — mark ALL unread notifications as read (batch). */
  markAllRead: "/noti/api/v1/notifications/read-batch",
} as const;
