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

  it("never sends a `read` param on the all/type paths (omitted = unfiltered)", async () => {
    const get = vi.fn().mockResolvedValue(makeEnvelope([]));
    const repo = new NotificationRepository(makeHttp({ get }));
    await repo.listNotifications({ filter: "all" });
    await repo.listNotifications({ filter: "grade" });
    for (const call of get.mock.calls) {
      const params = call[1]?.params as Record<string, unknown>;
      expect(params.read).toBeUndefined();
      expect(params.unread).toBeUndefined();
    }
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

  it("the unread (read=false) path survives the real unwrap too", async () => {
    const get = interceptedGet(() =>
      makeEnvelope([makeDto({ read: false })], null, false),
    );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread" });
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });
});

// ─── listNotifications: server-side unread filter (US-E18.37) ───────────────

/**
 * US-E18.37 — BE US-171 added `?read=false` to `GET /notifications`, replacing
 * US-E18.25's bounded client-side drain (ADR 0066). Contract constraints from
 * `services/notification/docs/openapi.yaml`:
 *  - only `read=false` is supported (`read=true` → 400
 *    NOTIFICATION_READ_FILTER_UNSUPPORTED);
 *  - `read` cannot be combined with `type` (→ 400 NOTIFICATION_FILTER_CONFLICT).
 * The UI filter is a single mutually-exclusive union ("all" | "unread" | one
 * type), so the unread page sends `read=false` and NEVER `type`.
 */
describe("NotificationRepository.listNotifications (US-E18.37 server-side unread)", () => {
  it("sends read=false as the ONLY filter param — never `type`, never read=true", async () => {
    const get = vi.fn().mockResolvedValue(makeEnvelope([]));
    const repo = new NotificationRepository(makeHttp({ get }));
    await repo.listNotifications({ filter: "unread", limit: 8 });

    expect(get).toHaveBeenCalledTimes(1);
    const params = get.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(params.read).toBe("false");
    expect(params.read).not.toBe("true");
    expect(params.type).toBeUndefined();
    expect(params.unread).toBeUndefined();
    expect(params.limit).toBe(8);
  });

  it("issues exactly ONE request per page — no client-side drain loop", async () => {
    // Under the old drain this all-read + hasMore:true response looped to
    // MAX_PAGES (20 calls). The server now filters, so one call is the truth.
    const get = vi
      .fn()
      .mockResolvedValue(
        makeEnvelope([makeDto({ id: "u1", read: false })], "c-next", true),
      );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread" });

    expect(get).toHaveBeenCalledTimes(1);
    expect(result.items.map((i) => i.id)).toEqual(["u1"]);
  });

  it("uses the server's OWN cursor/hasMore for the filtered result (not recomputed)", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        makeEnvelope(
          [makeDto({ id: "u1", read: false })],
          "cursor-unread",
          true,
        ),
      );
    const repo = new NotificationRepository(makeHttp({ get }));
    const result = await repo.listNotifications({ filter: "unread", limit: 8 });

    expect(result.nextCursor).toBe("cursor-unread");
    expect(result.hasMore).toBe(true);
  });

  it("forwards the caller cursor and the caller limit (no forced 100-row drain page)", async () => {
    const get = vi.fn().mockResolvedValue(makeEnvelope([]));
    const repo = new NotificationRepository(makeHttp({ get }));
    await repo.listNotifications({ filter: "unread", cursor: "c1", limit: 8 });

    const params = get.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(params.cursor).toBe("c1");
    expect(params.limit).toBe(8);
  });

  it("omits cursor on the first page", async () => {
    const get = vi.fn().mockResolvedValue(makeEnvelope([]));
    const repo = new NotificationRepository(makeHttp({ get }));
    await repo.listNotifications({ filter: "unread" });

    const params = get.mock.calls[0]?.[1]?.params as Record<string, unknown>;
    expect(params.cursor).toBeUndefined();
  });

  it("does not filter rows client-side — the server page IS the result", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
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
    const result = await repo.listNotifications({ filter: "unread" });
    expect(result.items.map((i) => i.id)).toEqual(["u1", "u2"]);
  });

  it("maps HTTP errors on the unread path to a failure", async () => {
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
