/**
 * Unit tests for notification use-cases (US-E10.2).
 * TDD red→green: mock repo via interface, test domain logic.
 */
import { describe, expect, it, vi } from "vitest";
import type { NotificationEntity } from "../entities/notification.entity";
import type { NotificationFailure } from "../failures/notification.failure";
import type { INotificationRepository } from "../repositories/i-notification.repository";
import { GetNotificationsUseCase } from "./get-notifications.use-case";
import { GetUnreadCountUseCase } from "./get-unread-count.use-case";
import { MarkAllReadUseCase } from "./mark-all-read.use-case";
import { MarkNotificationReadUseCase } from "./mark-notification-read.use-case";

// ─── Mock Repository ────────────────────────────────────────────────────────

function makeNotification(
  overrides: Partial<NotificationEntity> = {},
): NotificationEntity {
  return {
    id: "n-1",
    type: "grade",
    title: "Kết quả học tập",
    body: "Điểm Toán kỳ 1 đã được cập nhật",
    ts: "2025-11-01T08:00:00.000Z",
    read: false,
    ...overrides,
  };
}

function makeRepo(
  overrides: Partial<INotificationRepository> = {},
): INotificationRepository {
  return {
    listNotifications: vi.fn().mockResolvedValue({
      items: [makeNotification()],
      nextCursor: null,
      hasMore: false,
    }),
    getUnreadCount: vi.fn().mockResolvedValue({ count: 3 }),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── GetNotificationsUseCase ────────────────────────────────────────────────

describe("GetNotificationsUseCase", () => {
  it("returns the page from the repository unchanged", async () => {
    const repo = makeRepo();
    const uc = new GetNotificationsUseCase(repo);
    const result = await uc.execute({ filter: "all" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("grade");
    expect(result.hasMore).toBe(false);
    expect(repo.listNotifications).toHaveBeenCalledWith({
      filter: "all",
      cursor: undefined,
      limit: undefined,
    });
  });

  it("passes cursor and limit through to the repository", async () => {
    const repo = makeRepo();
    const uc = new GetNotificationsUseCase(repo);
    await uc.execute({ filter: "unread", cursor: "abc", limit: 8 });
    expect(repo.listNotifications).toHaveBeenCalledWith({
      filter: "unread",
      cursor: "abc",
      limit: 8,
    });
  });

  it("passes type filter (attendance) to the repository", async () => {
    const repo = makeRepo({
      listNotifications: vi.fn().mockResolvedValue({
        items: [makeNotification({ type: "attendance" })],
        nextCursor: "next-1",
        hasMore: true,
      }),
    });
    const uc = new GetNotificationsUseCase(repo);
    const result = await uc.execute({ filter: "attendance" });
    expect(result.items[0].type).toBe("attendance");
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("next-1");
  });

  it("propagates repository failure", async () => {
    const failure: NotificationFailure = { type: "network-error" };
    const repo = makeRepo({
      listNotifications: vi.fn().mockRejectedValue(failure),
    });
    const uc = new GetNotificationsUseCase(repo);
    await expect(uc.execute({ filter: "all" })).rejects.toMatchObject({
      type: "network-error",
    });
  });
});

// ─── GetUnreadCountUseCase ──────────────────────────────────────────────────

describe("GetUnreadCountUseCase", () => {
  it("returns count from the repository", async () => {
    const repo = makeRepo();
    const uc = new GetUnreadCountUseCase(repo);
    const result = await uc.execute();
    expect(result.count).toBe(3);
  });

  it("returns 0 when no unread notifications exist", async () => {
    const repo = makeRepo({
      getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    });
    const uc = new GetUnreadCountUseCase(repo);
    const result = await uc.execute();
    expect(result.count).toBe(0);
  });
});

// ─── MarkNotificationReadUseCase ────────────────────────────────────────────

describe("MarkNotificationReadUseCase", () => {
  it("calls repo.markRead with the given id", async () => {
    const repo = makeRepo();
    const uc = new MarkNotificationReadUseCase(repo);
    await uc.execute("n-1");
    expect(repo.markRead).toHaveBeenCalledWith("n-1");
  });

  it("throws not-found failure for an empty id", async () => {
    const repo = makeRepo();
    const uc = new MarkNotificationReadUseCase(repo);
    await expect(uc.execute("")).rejects.toMatchObject({ type: "not-found" });
    expect(repo.markRead).not.toHaveBeenCalled();
  });

  it("throws not-found failure for a whitespace id", async () => {
    const repo = makeRepo();
    const uc = new MarkNotificationReadUseCase(repo);
    await expect(uc.execute("   ")).rejects.toMatchObject({
      type: "not-found",
    });
  });

  it("propagates repo not-found failure", async () => {
    const failure: NotificationFailure = { type: "not-found" };
    const repo = makeRepo({
      markRead: vi.fn().mockRejectedValue(failure),
    });
    const uc = new MarkNotificationReadUseCase(repo);
    await expect(uc.execute("missing-id")).rejects.toMatchObject({
      type: "not-found",
    });
  });

  it("propagates network-error from repo", async () => {
    const failure: NotificationFailure = { type: "network-error" };
    const repo = makeRepo({
      markRead: vi.fn().mockRejectedValue(failure),
    });
    const uc = new MarkNotificationReadUseCase(repo);
    await expect(uc.execute("n-1")).rejects.toMatchObject({
      type: "network-error",
    });
  });
});

// ─── MarkAllReadUseCase ─────────────────────────────────────────────────────

describe("MarkAllReadUseCase", () => {
  it("calls repo.markAllRead", async () => {
    const repo = makeRepo();
    const uc = new MarkAllReadUseCase(repo);
    await uc.execute();
    expect(repo.markAllRead).toHaveBeenCalledOnce();
  });

  it("propagates network-error from repo", async () => {
    const failure: NotificationFailure = { type: "network-error" };
    const repo = makeRepo({
      markAllRead: vi.fn().mockRejectedValue(failure),
    });
    const uc = new MarkAllReadUseCase(repo);
    await expect(uc.execute()).rejects.toMatchObject({
      type: "network-error",
    });
  });
});
