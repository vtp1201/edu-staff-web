import { describe, expect, it, vi } from "vitest";
import { GetPinnedMessagesUseCase } from "./get-pinned-messages.use-case";
import { makeMessagingRepo } from "./group-test-utils";
import { fail, ok } from "./result";

describe("GetPinnedMessagesUseCase", () => {
  it("reads the room's pin board via the repository", async () => {
    const pinned = [
      {
        messageId: "m-1",
        senderId: "u-1",
        excerpt: "Nhắc lịch thi",
        sentAt: "2026-08-01T03:00:00.000Z",
        pinnedAt: "2026-08-02T03:00:00.000Z",
        pinnedBy: "u-2",
      },
    ];
    const getPinnedMessages = vi.fn().mockResolvedValue(ok(pinned));
    const useCase = new GetPinnedMessagesUseCase(
      makeMessagingRepo({ getPinnedMessages }),
    );

    const res = await useCase.execute("room-1");

    expect(getPinnedMessages).toHaveBeenCalledWith("room-1");
    expect(res).toEqual({ ok: true, value: pinned });
  });

  it("surfaces the repository failure unchanged (incl. the shared 429 quota)", async () => {
    const getPinnedMessages = vi.fn().mockResolvedValue(
      fail({
        type: "load-pinned-failed",
        cause: "SOCIAL_READ_RATE_LIMITED",
      }),
    );
    const useCase = new GetPinnedMessagesUseCase(
      makeMessagingRepo({ getPinnedMessages }),
    );

    const res = await useCase.execute("room-1");

    expect(res).toEqual({
      ok: false,
      failure: {
        type: "load-pinned-failed",
        cause: "SOCIAL_READ_RATE_LIMITED",
      },
    });
  });
});
