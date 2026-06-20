import { describe, expect, it, vi } from "vitest";
import { DeleteMessageUseCase } from "./delete-message.use-case";
import { makeMessagingRepo } from "./group-test-utils";
import { ok } from "./result";

const NOW = Date.parse("2026-06-20T12:00:00.000Z");
const clock = () => NOW;

describe("DeleteMessageUseCase", () => {
  it("deletes an own message sent within 1 hour", async () => {
    const deleteMessage = vi.fn().mockResolvedValue(ok(true));
    const useCase = new DeleteMessageUseCase(
      makeMessagingRepo({ deleteMessage }),
      clock,
    );

    const res = await useCase.execute({
      conversationId: "u1",
      messageId: "u1-2",
      isMine: true,
      sentAt: "2026-06-20T11:30:00.000Z",
    });

    expect(deleteMessage).toHaveBeenCalledWith("u1", "u1-2");
    expect(res).toEqual({ ok: true, value: true });
  });

  it("fails for a message that is not the user's own", async () => {
    const deleteMessage = vi.fn();
    const useCase = new DeleteMessageUseCase(
      makeMessagingRepo({ deleteMessage }),
      clock,
    );

    const res = await useCase.execute({
      conversationId: "u1",
      messageId: "u1-1",
      isMine: false,
      sentAt: "2026-06-20T11:59:00.000Z",
    });

    expect(res).toEqual({
      ok: false,
      failure: { type: "delete-message-failed", cause: "not-own" },
    });
    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it("fails when the message is older than 1 hour", async () => {
    const deleteMessage = vi.fn();
    const useCase = new DeleteMessageUseCase(
      makeMessagingRepo({ deleteMessage }),
      clock,
    );

    const res = await useCase.execute({
      conversationId: "u1",
      messageId: "u1-2",
      isMine: true,
      sentAt: "2026-06-20T10:00:00.000Z",
    });

    expect(res).toEqual({
      ok: false,
      failure: { type: "delete-message-failed", cause: "expired" },
    });
    expect(deleteMessage).not.toHaveBeenCalled();
  });
});
