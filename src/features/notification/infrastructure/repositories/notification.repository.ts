import "server-only";
import type { AxiosInstance } from "axios";
import { NOTIFICATION_EP } from "@/bootstrap/endpoint/notification.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type {
  NotificationFilter,
  NotificationPage,
  UnreadCount,
} from "../../domain/entities/notification.entity";
import type { NotificationFailure } from "../../domain/failures/notification.failure";
import type { INotificationRepository } from "../../domain/repositories/i-notification.repository";
import { PAGE_SIZE } from "../../domain/repositories/i-notification.repository";
import type { NotificationResponseDto } from "../dtos/notification-response.dto";
import { mapNotification } from "../mappers/notification.mapper";

/**
 * Map a normalised ApiError to the notification failure union.
 * Branch on error.code (UPPER_SNAKE) / status — never on message.
 */
export function toFailure(err: unknown): NotificationFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (status === 401 || code === "UNAUTHORIZED") {
    return { type: "unauthorized" };
  }
  if (status === 404 || code === "NOTIFICATION_NOT_FOUND") {
    return { type: "not-found" };
  }
  return { type: "unknown" };
}

export class NotificationRepository implements INotificationRepository {
  /** locale is injected from the server context for mapper use. */
  constructor(
    private readonly http: AxiosInstance,
    private readonly locale: string = "vi",
  ) {}

  async listNotifications(params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationPage> {
    try {
      const { filter, cursor, limit = PAGE_SIZE } = params;
      const queryParams: Record<string, unknown> = { limit };
      if (filter !== "all" && filter !== "unread") queryParams.type = filter;
      if (filter === "unread") queryParams.unread = true;
      if (cursor) queryParams.cursor = cursor;

      const envelope = (await this.http.get(NOTIFICATION_EP.list, {
        params: queryParams,
        // raw: true needed to access meta.pagination
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<NotificationResponseDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      const items = (data ?? []).map((dto) =>
        mapNotification(dto, this.locale),
      );
      return {
        items,
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      };
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getUnreadCount(): Promise<UnreadCount> {
    try {
      const dto = (await this.http.get(
        NOTIFICATION_EP.unreadCount,
      )) as unknown as { count: number };
      return { count: dto.count ?? 0 };
    } catch (err) {
      throw toFailure(err);
    }
  }

  async markRead(id: string): Promise<void> {
    try {
      await this.http.patch(NOTIFICATION_EP.markRead(id));
    } catch (err) {
      throw toFailure(err);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await this.http.patch(NOTIFICATION_EP.markAllRead);
    } catch (err) {
      throw toFailure(err);
    }
  }
}
