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
import type {
  NotificationResponseDto,
  ReadBatchResponseDto,
  UnreadCountResponseDto,
} from "../dtos/notification-response.dto";
import { mapNotification } from "../mappers/notification.mapper";

/**
 * Defensive bound on the `read-batch` repeat loop (US-E18.25, ADR 0066). BE
 * caps each call at 500 rows, so 40 iterations = 20 000 notifications — an
 * absurd inbox given the 90-day TTL. Tripping it means the server is
 * misbehaving (always returning `hasMore:true`), not that the bound is low.
 */
export const MAX_BATCHES = 40;

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
  constructor(private readonly http: AxiosInstance) {}

  async listNotifications(params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationPage> {
    const { filter, cursor, limit = PAGE_SIZE } = params;

    try {
      const queryParams: Record<string, unknown> = { limit };
      // US-E18.37 — the two filter dimensions are MUTUALLY EXCLUSIVE on the
      // wire: `read` cannot be combined with `type` (400
      // NOTIFICATION_FILTER_CONFLICT), and only `read=false` is supported
      // (`read=true` → 400 NOTIFICATION_READ_FILTER_UNSUPPORTED). The UI filter
      // is a single union ("all" | "unread" | one type) so this if/else-if maps
      // 1:1 and can never emit both. "all" sends neither = unfiltered.
      if (filter === "unread") queryParams.read = "false";
      else if (filter !== "all") queryParams.type = filter;
      if (cursor) queryParams.cursor = cursor;

      const envelope = (await this.http.get(NOTIFICATION_EP.list, {
        params: queryParams,
        // raw: true needed to access meta.pagination
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<NotificationResponseDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return {
        items: (data ?? []).map(mapNotification),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      };
    } catch (err) {
      throw toFailure(err);
    }
  }

  /**
   * US-E18.25 — the REAL GENERIC singular `unread-count` endpoint (BE US-146).
   * Supersedes US-E18.18's per-room `unread-counts` (PLURAL, messaging) SUM
   * stand-in: that concept stays owned by `MessagingRepository` and is not
   * touched here. Exact `COUNT(*)` server-side — no summing client-side.
   */
  async getUnreadCount(): Promise<UnreadCount> {
    try {
      const res = (await this.http.get(
        NOTIFICATION_EP.unreadCount,
      )) as unknown as UnreadCountResponseDto;
      return { count: res?.count ?? 0 };
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

  /**
   * US-E18.25 — `read-batch` is capped at 500 rows per call and signals the
   * remainder via `hasMore`, so the caller MUST repeat until it goes false.
   */
  async markAllRead(): Promise<void> {
    let hasMore = true;
    let iterations = 0;

    while (hasMore) {
      if (iterations >= MAX_BATCHES) {
        // Invariant violation (server never stops saying "more"), NOT a domain
        // failure — deliberately thrown raw rather than mapped via toFailure so
        // it surfaces loudly instead of hiding as a generic "unknown" error.
        // The Server Action boundary still degrades it to errorKey "unknown"
        // for the user, so log it server-side first: this is the only signal
        // ops gets that BE is misbehaving rather than a plain request failure.
        const message = `markAllRead exceeded MAX_BATCHES (${MAX_BATCHES}) — read-batch kept reporting hasMore:true`;
        console.error(`[notification] ${message}`);
        throw new Error(message);
      }

      let res: ReadBatchResponseDto | undefined;
      try {
        res = (await this.http.patch(
          NOTIFICATION_EP.markAllRead,
        )) as unknown as ReadBatchResponseDto;
      } catch (err) {
        throw toFailure(err);
      }

      hasMore = res?.hasMore === true;
      iterations += 1;
    }
  }
}
