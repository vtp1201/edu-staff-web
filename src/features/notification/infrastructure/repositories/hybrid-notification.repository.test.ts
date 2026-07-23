import { describe, expect, it, vi } from "vitest";
import type { INotificationRepository } from "../../domain/repositories/i-notification.repository";
import { HybridNotificationRepository } from "./hybrid-notification.repository";

function stub(
  over: Partial<INotificationRepository> = {},
): INotificationRepository {
  return {
    listNotifications: vi.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    }),
    getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe("HybridNotificationRepository (US-E18.18)", () => {
  it("routes getUnreadCount to the REAL repo", async () => {
    const real = stub({
      getUnreadCount: vi.fn().mockResolvedValue({ count: 7 }),
    });
    const mock = stub();
    const repo = new HybridNotificationRepository(real, mock);

    const res = await repo.getUnreadCount();

    expect(res).toEqual({ count: 7 });
    expect(real.getUnreadCount).toHaveBeenCalledOnce();
    expect(mock.getUnreadCount).not.toHaveBeenCalled();
  });

  it("force-mocks listNotifications / markRead / markAllRead (never the real repo)", async () => {
    const real = stub();
    const mock = stub();
    const repo = new HybridNotificationRepository(real, mock);

    await repo.listNotifications({ filter: "all" });
    await repo.markRead("n-1");
    await repo.markAllRead();

    expect(mock.listNotifications).toHaveBeenCalledOnce();
    expect(mock.markRead).toHaveBeenCalledWith("n-1");
    expect(mock.markAllRead).toHaveBeenCalledOnce();
    expect(real.listNotifications).not.toHaveBeenCalled();
    expect(real.markRead).not.toHaveBeenCalled();
    expect(real.markAllRead).not.toHaveBeenCalled();
  });
});
