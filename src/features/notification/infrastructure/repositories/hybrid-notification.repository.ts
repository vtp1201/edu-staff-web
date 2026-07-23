import "server-only";
import type {
  NotificationFilter,
  NotificationPage,
  UnreadCount,
} from "../../domain/entities/notification.entity";
import type { INotificationRepository } from "../../domain/repositories/i-notification.repository";

/**
 * US-E18.18 partial-real facade (same pattern as `HybridMessagingRepository`).
 *
 * Only `getUnreadCount` has a real backing (the notification `cmd/server`
 * per-room `unread-counts` endpoint, summed) and is served by `real`.
 * `listNotifications`/`markRead`/`markAllRead` have ZERO real endpoint (confirmed
 * — no generic notification list/read surface exists on the wire) and are
 * force-served by `mock` regardless of `NEXT_PUBLIC_USE_MOCK`, so those flows
 * keep their existing behavior unchanged.
 */
export class HybridNotificationRepository implements INotificationRepository {
  constructor(
    private readonly real: INotificationRepository,
    private readonly mock: INotificationRepository,
  ) {}

  // --- Real slice ---
  getUnreadCount(): Promise<UnreadCount> {
    return this.real.getUnreadCount();
  }

  // --- Force-mocked slice (no real contract) ---
  listNotifications(params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationPage> {
    return this.mock.listNotifications(params);
  }
  markRead(id: string): Promise<void> {
    return this.mock.markRead(id);
  }
  markAllRead(): Promise<void> {
    return this.mock.markAllRead();
  }
}
