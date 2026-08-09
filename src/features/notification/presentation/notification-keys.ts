import type { NotificationFilter } from "../domain/entities/notification.entity";

/**
 * Query keys for notification data. Its OWN module (not the container) so the
 * app-shell header can share the unread-count entry without pulling the whole
 * notifications centre into every page's bundle.
 *
 * The unread-count entry's cached value is `{ count }`, NOT a bare number —
 * `notifications-center-container` also `setQueryData`s that shape when an SSE
 * `notification.new` arrives. Every reader must agree.
 */
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (filter: NotificationFilter) =>
    ["notifications", "list", filter] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
} as const;

/** Cached shape behind {@link notificationKeys.unreadCount}. */
export interface UnreadCountCache {
  count: number;
}
