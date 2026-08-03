import type {
  NotificationFilter,
  NotificationPage,
  UnreadCount,
} from "../entities/notification.entity";

export const PAGE_SIZE = 8;

/** Repository interface for notifications (DIP — implemented by infra layer). */
export interface INotificationRepository {
  /**
   * Cursor-paged list of notifications for the current user.
   * `filter` is mutually exclusive: "all" sends no filter, "unread" narrows by
   * read state, any other value narrows by notification type (US-E18.37).
   * `cursor` is undefined for the first page.
   */
  listNotifications(params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationPage>;

  /** Current unread notification count. */
  getUnreadCount(): Promise<UnreadCount>;

  /**
   * Mark a single notification as read.
   * Throws {@link NotificationFailure} on not-found or network error.
   */
  markRead(id: string): Promise<void>;

  /**
   * Mark ALL unread notifications as read (batch).
   * Throws {@link NotificationFailure} on network error.
   */
  markAllRead(): Promise<void>;
}
