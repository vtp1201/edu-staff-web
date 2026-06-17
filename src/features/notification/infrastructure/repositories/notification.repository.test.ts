/**
 * Integration tests for NotificationRepository (US-E10.2).
 * Tests the HTTP adapter + mapper + failure mapping via mock axios.
 */

import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { NotificationResponseDto } from "../dtos/notification-response.dto";
import { NotificationRepository, toFailure } from "./notification.repository";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDto(
  overrides: Partial<NotificationResponseDto> = {},
): NotificationResponseDto {
  return {
    id: "n-1",
    type: "grade",
    titleVi: "Kết quả học tập",
    titleEn: "Academic results",
    bodyVi: "Điểm Toán đã cập nhật",
    bodyEn: "Math score updated",
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
    const repo = new NotificationRepository(http, "vi");
    const result = await repo.listNotifications({ filter: "all" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Kết quả học tập");
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor and limit to the HTTP call", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(makeEnvelope([])),
    });
    const repo = new NotificationRepository(http, "vi");
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
    const repo = new NotificationRepository(http, "vi");
    await repo.listNotifications({ filter: "grade" });
    expect(http.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ type: "grade" }),
      }),
    );
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
    const repo = new NotificationRepository(http, "vi");
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
    const repo = new NotificationRepository(http, "vi");
    const result = await repo.listNotifications({ filter: "all" });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("cursor-next");
  });
});

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe("NotificationRepository.getUnreadCount", () => {
  it("returns count from response", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue({ count: 5 }),
    });
    const repo = new NotificationRepository(http, "vi");
    const result = await repo.getUnreadCount();
    expect(result.count).toBe(5);
  });
});

// ─── markRead ─────────────────────────────────────────────────────────────────

describe("NotificationRepository.markRead", () => {
  it("calls PATCH with the notification id", async () => {
    const http = makeHttp({
      patch: vi.fn().mockResolvedValue(undefined),
    });
    const repo = new NotificationRepository(http, "vi");
    await repo.markRead("n-1");
    expect(http.patch).toHaveBeenCalledWith(expect.stringContaining("n-1"));
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
    const repo = new NotificationRepository(http, "vi");
    await expect(repo.markRead("missing")).rejects.toMatchObject({
      type: "not-found",
    });
  });
});

// ─── markAllRead ──────────────────────────────────────────────────────────────

describe("NotificationRepository.markAllRead", () => {
  it("calls PATCH batch endpoint", async () => {
    const http = makeHttp({
      patch: vi.fn().mockResolvedValue(undefined),
    });
    const repo = new NotificationRepository(http, "vi");
    await repo.markAllRead();
    expect(http.patch).toHaveBeenCalledOnce();
  });
});
