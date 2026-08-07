import { describe, expect, it, vi } from "vitest";
import { makeMessagingRepo } from "./group-test-utils";
import { fail, ok } from "./result";
import { UnpinMessageUseCase } from "./unpin-message.use-case";

describe("UnpinMessageUseCase", () => {
  it("unpins the message via the repo", async () => {
    const unpinMessage = vi.fn().mockResolvedValue(ok(true));
    const useCase = new UnpinMessageUseCase(
      makeMessagingRepo({ unpinMessage }),
    );

    const res = await useCase.execute("room-1", "m-1");

    expect(unpinMessage).toHaveBeenCalledWith("room-1", "m-1");
    expect(res).toEqual({ ok: true, value: true });
  });

  it("surfaces message-not-pinned unchanged (404 on a stale pin board)", async () => {
    const unpinMessage = vi
      .fn()
      .mockResolvedValue(fail({ type: "message-not-pinned" }));
    const useCase = new UnpinMessageUseCase(
      makeMessagingRepo({ unpinMessage }),
    );

    const res = await useCase.execute("room-1", "m-1");

    expect(res).toEqual({ ok: false, failure: { type: "message-not-pinned" } });
  });

  it("surfaces pin-forbidden unchanged (caller lacks moderate_msg)", async () => {
    const unpinMessage = vi
      .fn()
      .mockResolvedValue(fail({ type: "pin-forbidden" }));
    const useCase = new UnpinMessageUseCase(
      makeMessagingRepo({ unpinMessage }),
    );

    const res = await useCase.execute("room-1", "m-1");

    expect(res).toEqual({ ok: false, failure: { type: "pin-forbidden" } });
  });
});
