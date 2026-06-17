import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  NotificationEntity,
  NotificationFilter,
  NotificationPage,
  UnreadCount,
} from "../../../domain/entities/notification.entity";
import type { NotificationFailure } from "../../../domain/failures/notification.failure";
import type { INotificationRepository } from "../../../domain/repositories/i-notification.repository";
import { PAGE_SIZE } from "../../../domain/repositories/i-notification.repository";
import { mapNotification } from "../../mappers/notification.mapper";
import { MOCK_NOTIFICATIONS } from "./fixtures";

function fail(type: NotificationFailure["type"]): never {
  const failure: NotificationFailure = { type };
  throw failure;
}

// Module-level mutable state for deterministic in-process mutation.
let _items: NotificationEntity[] = MOCK_NOTIFICATIONS.map((dto) =>
  mapNotification(dto, "vi"),
);

export class MockNotificationRepository implements INotificationRepository {
  constructor() {
    // Reset to fixture state on each instantiation so tests stay deterministic.
    _items = MOCK_NOTIFICATIONS.map((dto) => mapNotification(dto, "vi"));
  }

  async listNotifications(params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationPage> {
    await mockDelay(200);
    const { filter, cursor, limit = PAGE_SIZE } = params;

    // Determine which items match the filter
    const filtered = _items.filter((item) => {
      if (filter === "all") return true;
      if (filter === "unread") return !item.read;
      return item.type === filter;
    });

    // Cursor-based pagination: find offset from id
    let startIdx = 0;
    if (cursor) {
      const idx = filtered.findIndex((item) => item.id === cursor);
      startIdx = idx >= 0 ? idx + 1 : 0;
    }

    const page = filtered.slice(startIdx, startIdx + limit);
    const remaining = filtered.slice(startIdx + limit);

    return {
      items: page,
      nextCursor:
        remaining.length > 0 ? (page[page.length - 1]?.id ?? null) : null,
      hasMore: remaining.length > 0,
    };
  }

  async getUnreadCount(): Promise<UnreadCount> {
    await mockDelay(100);
    return { count: _items.filter((item) => !item.read).length };
  }

  async markRead(id: string): Promise<void> {
    await mockDelay(150);
    const idx = _items.findIndex((item) => item.id === id);
    if (idx < 0) fail("not-found");
    _items = _items.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    );
  }

  async markAllRead(): Promise<void> {
    await mockDelay(200);
    _items = _items.map((item) => ({ ...item, read: true }));
  }
}
