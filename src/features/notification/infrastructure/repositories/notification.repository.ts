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
  NotificationEntity,
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
 * Defensive bound on the client-side "unread" drain (US-E18.25, ADR 0066).
 * `GET /notifications` has NO `unread`/`read` query param, so the shipped
 * "Unread" tab narrows client-side: 20 pages × 100 rows = 2 000 rows scanned.
 */
export const MAX_PAGES = 20;

/** Page size used while draining for unread rows (BE max is 100). */
const DRAIN_PAGE_SIZE = 100;

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
    if (filter === "unread") return this.drainUnread(cursor, limit);

    try {
      const queryParams: Record<string, unknown> = { limit };
      if (filter !== "all") queryParams.type = filter;
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
   * US-E18.25 / ADR 0066 — bounded client-side drain for the "Unread" tab.
   *
   * The real wire has no `unread`/`read` filter, so we page (at the BE max of
   * 100) following the REAL cursor, keep only `read === false` rows, and stop
   * as soon as the caller's page size is satisfied, the server says there is
   * nothing more, or `MAX_PAGES` trips. `hasMore` reported back is the REAL
   * last-page value (never locally recomputed) so "Load more" keeps draining
   * from where the server left off. Documented as less efficient, not
   * incorrect — cross-repo ask #42 requests a server-side filter.
   *
   * Returns EVERY unread row found on the pages it fetched — deliberately NOT
   * capped to `limit`. The cursor is page-aligned (it always points past the
   * last page fetched), so capping would strand the surplus unread rows of
   * that page forever: "Load more" resumes after them and nothing would ever
   * show them again. Overshoot is bounded by one page (`DRAIN_PAGE_SIZE`).
   */
  private async drainUnread(
    cursor: string | undefined,
    limit: number,
  ): Promise<NotificationPage> {
    try {
      const collected: NotificationEntity[] = [];
      let nextCursor: string | undefined = cursor;
      let realHasMore = false;

      for (let page = 0; page < MAX_PAGES; page += 1) {
        const queryParams: Record<string, unknown> = {
          limit: DRAIN_PAGE_SIZE,
        };
        if (nextCursor) queryParams.cursor = nextCursor;

        const envelope = (await this.http.get(NOTIFICATION_EP.list, {
          params: queryParams,
          ...({ raw: true } as Record<string, unknown>),
        })) as unknown as ApiEnvelope<NotificationResponseDto[]>;

        const { data, pagination } = parseEnvelope(envelope);
        for (const dto of data ?? []) {
          if (!dto.read) collected.push(mapNotification(dto));
        }
        nextCursor = pagination?.nextCursor ?? undefined;
        realHasMore = pagination?.hasMore ?? false;
        if (collected.length >= limit || !realHasMore) break;
      }

      return {
        // Uncapped on purpose — see the doc comment above. `limit` only
        // decides when to STOP fetching more pages, never what to hand back.
        items: collected,
        nextCursor: nextCursor ?? null,
        hasMore: realHasMore,
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
