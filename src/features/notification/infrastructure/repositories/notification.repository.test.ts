/**
 * Integration tests for NotificationRepository (US-E10.2, rewired US-E18.25).
 * Tests the HTTP adapter + mapper + failure mapping via mock axios.
 */

import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import type { NotificationResponseDto } from "../dtos/notification-response.dto";
import {
  MAX_BATCHES,
  MAX_PAGES,
  NotificationRepository,
  toFailure,
} from "./notification.repository";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDto(
  overrides: Partial<NotificationResponseDto> = {},
): NotificationResponseDto {
  return {
    id: "n-1",
    type: "grade",
    titleKey: "notification_grade_conduct_approved_title",
    titleParams: {},
    bodyKey: "notification_grade_conduct_approved_body",
    bodyParams: { occurredAt: "2025-11-01T08:00:00.000Z" },
    ts: "2025-11-01T08:00:00.000Z",
    read: false,
    ...overrides,
  };
}

function makeEnvelope<T>(
  data: T,
  nextCursor: string | null = null,
  hasMore = false,
) {
  return {
    success: true,
    data,
    error: null,
    meta: { pagination: { nextCursor, hasMore } },
  };
}

function makeHttp(overrides: Partial<AxiosInstance> = {}): AxiosInstance {
  return {
    get: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as AxiosInstance;
}

// ─── toFailure ────────────────────────────────────────────────────────────────

describe("toFailure", () => {
  it("returns network-error for NETWORK_ERROR code", () => {
    const err = new ApiError({
      code: "NETWORK_ERROR",
      message: "fail",
      retryable: true,
    });
    expect(toFailure(err)).toEqual({ type: "network-error" });
  });

  it("returns unauthorized for 401 status", () => {
    const err = new ApiError({
      code: "UNAUTHORIZED",
      message: "fail",
      retryable: false,
      status: 401,
    });
    expect(toFailure(err)).toEqual({ type: "unauthorized" });
  });

  it("returns not-found for 404 status", () => {
    const err = new ApiError({
      code: "NOTIFICATION_NOT_FOUND",
      message: "fail",
      retryable: false,
      status: 404,
    });
    expect(toFailure(err)).toEqual({ type: "not-found" });
  });

  it("returns unknown for other errors", () => {
    const err = new ApiError({
      code: "SERVER_ERROR",
      message: "fail",
      retryable: false,
      status: 500,
    });
    expect(toFailure(err)).toEqual({ type: "unknown" });
  });
});

// ─── listNotifications ────────────────────────────────────────────────────────

describe("NotificationRepository.listNotifications", () => {
  it("returns mapped entities from envelope", async () => {
    const dto = makeDto();
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(makeEnvelope([dto])),
    });
    const repo = new NotificationRepository(http);
    const result = await repo.listNotifications({ filter: "all" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].titleKey).toBe(
      "notification_grade_conduct_approved_title",
    );
    expect(result.items[0].bodyParams).toEqual({
      occurredAt: "2025-11-01T08:00:00.000Z",
    });
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor and limit to the HTTP call", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(makeEnvelope([])),
    });
    const repo = new NotificationRepository(http);
    await repo.listNotifications({ filter: "all", cursor: "abc", limit: 8 });
    expect(http.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ cursor: "abc", limit: 8 }),
      }),
    );
  });

  it("adds type filter when filter is not all/unread", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(makeEnvelope([])),
    });
    const repo = new NotificationRepository(http);
    await repo.listNotifications({ filter: "grade" });
    expect(http.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ type: "grade" }),
      }),
    );
  });

  it("never sends an `unread` query param (no such param exists on the real wire)", async () => {
    const get = vi.fn().mockResolvedValue(makeEnvelope([]));
    const repo = new NotificationRepository(makeHttp({ get }));
    await repo.listNotifications({ filter: "unread" });
    const params = get.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(params.unread).toBeUndefined();
    expect(params.read).toBeUndefined();
    expect(params.type).toBeUndefined();
  });

  it("throws network-error failure when HTTP fails", async () => {
    const err = new ApiError({
      code: "NETWORK_ERROR",
      message: "fail",
      retryable: true,
    });
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(err),
    });
    const repo = new NotificationRepository(http);
    await expect(
      repo.listNotifications({ filter: "all" }),
    ).rejects.toMatchObject({ type: "network-error" });
  });

  it("surfaces pagination when hasMore is true", async () => {
    const http = makeHttp({
      get: vi
        .fn()
        .mockResolvedValue(makeEnvelope([makeDto()], "cursor-next", true)),
    });
    const repo = new NotificationRepository(http);
    const result = await repo.listNotifications({ filter: "all" });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("cursor-next");
  });
});

// ─── real interceptor pipeline (raw-flag placement guard) ─────────────────────

/**
 * Protective regression guard for `{ raw: true }` config placement (US-E18.19).
 * `listNotifications` already spreads `raw: true` as a sibling of `params`; this
 * suite locks that in. The suites above mock `http.get` to return an envelope
 * directly, so they cannot catch a future edit that nests `raw` inside `params`
 * (isRawCall reads `config.raw` at the TOP level). Here `http.get` runs the REAL
 * `unwrapResponse` interceptor against the config the repo actually passes: a
 * nested `params.raw` would leave isRawCall false → envelope unwrapped to its
 * array → `parseEnvelope(array)` throws UNKNOWN_ERROR. Passes with no source
 * change, confirming raw is at config top-level.
 */
describe("NotificationRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("listNotifications survives the real unwrap and reads pagination", async () => {
    const get = interceptedGet(() =>
      makeEnvelope([makeDto()], "cursor-next", true),
    );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "all" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].titleKey).toBe(
      "notification_grade_conduct_approved_title",
    );
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("cursor-next");
  });

  it("the unread drain survives the real unwrap too", async () => {
    const get = interceptedGet(() =>
      makeEnvelope([makeDto({ read: false })], null, false),
    );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread" });
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });
});

// ─── listNotifications: bounded client-side unread drain (US-E18.25) ─────────

describe("NotificationRepository.listNotifications (US-E18.25 unread drain)", () => {
  it("drains multiple pages to accumulate unread items when early pages are all-read", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        makeEnvelope(
          [
            makeDto({ id: "r1", read: true }),
            makeDto({ id: "r2", read: true }),
            makeDto({ id: "r3", read: true }),
          ],
          "c1",
          true,
        ),
      )
      .mockResolvedValueOnce(
        makeEnvelope(
          [
            makeDto({ id: "u1", read: false }),
            makeDto({ id: "u2", read: false }),
          ],
          null,
          false,
        ),
      );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({
      filter: "unread",
      limit: 8,
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(result.items.map((i) => i.id)).toEqual(["u1", "u2"]);
    expect(result.hasMore).toBe(false);

    const firstParams = get.mock.calls[0]?.[1]?.params as Record<
      string,
      unknown
    >;
    const secondParams = get.mock.calls[1]?.[1]?.params as Record<
      string,
      unknown
    >;
    expect(firstParams.cursor).toBeUndefined();
    expect(secondParams.cursor).toBe("c1");
    expect(firstParams.type).toBeUndefined();
    expect(secondParams.type).toBeUndefined();
    expect(firstParams.limit).toBe(100);
  });

  it("stops draining once MAX_PAGES is hit even if hasMore stays true", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        makeEnvelope([makeDto({ read: true })], "c-next", true),
      );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread" });
    expect(MAX_PAGES).toBe(20);
    expect(get).toHaveBeenCalledTimes(MAX_PAGES);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(true);
  });

  it("reports the real hasMore from the last page fetched, not a locally computed one", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        makeEnvelope(
          [
            makeDto({ id: "u1", read: false }),
            makeDto({ id: "u2", read: false }),
          ],
          "c1",
          true,
        ),
      );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread", limit: 2 });
    expect(get).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("c1");
  });

  it("returns EVERY unread row found on a page, never truncating to `limit`", async () => {
    // The cursor is page-aligned: capping to `limit` here would strand the
    // surplus unread rows of this page forever ("Load more" resumes past them).
    const limit = 8;
    const unreadOnThisPage = Array.from({ length: limit + 5 }, (_, i) =>
      makeDto({ id: `u${i}`, read: false }),
    );
    const get = vi
      .fn()
      .mockResolvedValue(makeEnvelope(unreadOnThisPage, "c1", true));
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread", limit });

    expect(get).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(limit + 5);
    expect(result.items.map((i) => i.id)).toEqual(
      unreadOnThisPage.map((d) => d.id),
    );
    expect(result.nextCursor).toBe("c1");
    expect(result.hasMore).toBe(true);
  });

  it("maps HTTP errors during the drain to a failure", async () => {
    const err = new ApiError({
      code: "NOTIFICATION_INVALID_CURSOR",
      message: "bad cursor",
      retryable: false,
      status: 400,
    });
    const get = vi.fn().mockRejectedValue(err);
    const repo = new NotificationRepository(makeHttp({ get }));
    await expect(
      repo.listNotifications({ filter: "unread" }),
    ).rejects.toMatchObject({ type: "unknown" });
  });
});

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe("NotificationRepository.getUnreadCount (US-E18.25 real singular)", () => {
  it("calls the real singular unread-count endpoint and returns count directly (no sum)", async () => {
    const get = vi.fn().mockResolvedValue({ count: 7 });
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.getUnreadCount();
    expect(get).toHaveBeenCalledWith("/noti/api/v1/notifications/unread-count");
    expect(result.count).toBe(7);
  });

  it("never calls the plural per-room unread-counts endpoint (US-E18.18 messaging concept)", async () => {
    const get = vi.fn().mockResolvedValue({ count: 0 });
    const repo = new NotificationRepository(makeHttp({ get }));
    await repo.getUnreadCount();
    for (const [url] of get.mock.calls) {
      expect(url).not.toContain("unread-counts");
    }
  });

  it("degrades to 0 when the endpoint returns no count", async () => {
    const http = makeHttp({ get: vi.fn().mockResolvedValue({}) });
    const repo = new NotificationRepository(http);
    expect((await repo.getUnreadCount()).count).toBe(0);
  });

  it("throws a mapped failure on error", async () => {
    const err = new ApiError({
      code: "UNAUTHORIZED",
      message: "x",
      retryable: false,
      status: 401,
    });
    const http = makeHttp({ get: vi.fn().mockRejectedValue(err) });
    const repo = new NotificationRepository(http);
    await expect(repo.getUnreadCount()).rejects.toMatchObject({
      type: "unauthorized",
    });
  });
});

// ─── markRead ─────────────────────────────────────────────────────────────────

describe("NotificationRepository.markRead", () => {
  it("calls PATCH with the notification id", async () => {
    const http = makeHttp({
      patch: vi.fn().mockResolvedValue(undefined),
    });
    const repo = new NotificationRepository(http);
    await repo.markRead("n-1");
    expect(http.patch).toHaveBeenCalledWith(
      "/noti/api/v1/notifications/n-1/read",
    );
  });

  it("throws not-found on 404", async () => {
    const err = new ApiError({
      code: "NOTIFICATION_NOT_FOUND",
      message: "fail",
      retryable: false,
      status: 404,
    });
    const http = makeHttp({
      patch: vi.fn().mockRejectedValue(err),
    });
    const repo = new NotificationRepository(http);
    await expect(repo.markRead("missing")).rejects.toMatchObject({
      type: "not-found",
    });
  });
});

// ─── markAllRead (US-E18.25 500-row-cap batch loop) ──────────────────────────

describe("NotificationRepository.markAllRead (US-E18.25 batch loop)", () => {
  it("stops after one batch when hasMore is false immediately", async () => {
    const patch = vi
      .fn()
      .mockResolvedValue({ markedCount: 120, hasMore: false });
    const repo = new NotificationRepository(makeHttp({ patch }));
    await repo.markAllRead();
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith("/noti/api/v1/notifications/read-batch");
  });

  it("loops while hasMore is true, stops on false (2-batch scenario)", async () => {
    const patch = vi
      .fn()
      .mockResolvedValueOnce({ markedCount: 500, hasMore: true })
      .mockResolvedValueOnce({ markedCount: 30, hasMore: false });
    const repo = new NotificationRepository(makeHttp({ patch }));
    await repo.markAllRead();
    expect(patch).toHaveBeenCalledTimes(2);
  });

  it("trips the MAX_BATCHES guard on a pathological always-hasMore:true response", async () => {
    const patch = vi
      .fn()
      .mockResolvedValue({ markedCount: 500, hasMore: true });
    // The Server Action boundary degrades this to a generic errorKey, so the
    // server-side log is the only signal ops gets — assert it happens.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = new NotificationRepository(makeHttp({ patch }));

    await expect(repo.markAllRead()).rejects.toThrow(/MAX_BATCHES/);
    expect(MAX_BATCHES).toBe(40);
    expect(patch).toHaveBeenCalledTimes(MAX_BATCHES);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("MAX_BATCHES"));

    logged.mockRestore();
  });

  it("maps HTTP errors to a failure", async () => {
    const err = new ApiError({
      code: "UNAUTHORIZED",
      message: "x",
      retryable: false,
      status: 401,
    });
    const patch = vi.fn().mockRejectedValue(err);
    const repo = new NotificationRepository(makeHttp({ patch }));
    await expect(repo.markAllRead()).rejects.toMatchObject({
      type: "unauthorized",
    });
  });
});
