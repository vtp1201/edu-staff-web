import { describe, expect, it, vi } from "vitest";
import { makeMessagingRepo } from "./group-test-utils";
import { MarkConversationReadUseCase } from "./mark-conversation-read.use-case";
import { fail, ok } from "./result";

describe("MarkConversationReadUseCase", () => {
  it("delegates to the repository and returns its result", async () => {
    const markConversationRead = vi.fn().mockResolvedValue(ok(true));
    const useCase = new MarkConversationReadUseCase(
      makeMessagingRepo({ markConversationRead }),
    );

    const res = await useCase.execute("room-1");

    expect(markConversationRead).toHaveBeenCalledWith("room-1");
    expect(res).toEqual({ ok: true, value: true });
  });

  it("surfaces the repository failure unchanged", async () => {
    const markConversationRead = vi
      .fn()
      .mockResolvedValue(
        fail({ type: "mark-read-failed", cause: "ROOM_NOT_MEMBER" }),
      );
    const useCase = new MarkConversationReadUseCase(
      makeMessagingRepo({ markConversationRead }),
    );

    const res = await useCase.execute("room-1");

    expect(res).toEqual({
      ok: false,
      failure: { type: "mark-read-failed", cause: "ROOM_NOT_MEMBER" },
    });
  });
});
