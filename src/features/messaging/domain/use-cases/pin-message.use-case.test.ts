import { describe, expect, it, vi } from "vitest";
import { makeMessagingRepo } from "./group-test-utils";
import { PinMessageUseCase } from "./pin-message.use-case";
import { fail, ok } from "./result";

describe("PinMessageUseCase", () => {
  it("pins the message via the repo", async () => {
    const pinMessage = vi.fn().mockResolvedValue(ok(true));
    const useCase = new PinMessageUseCase(makeMessagingRepo({ pinMessage }));

    const res = await useCase.execute("g1", "g1-2");

    expect(pinMessage).toHaveBeenCalledWith("g1", "g1-2");
    expect(res).toEqual({ ok: true, value: true });
  });

  it("surfaces not-group-admin when a non-admin pins a group message", async () => {
    const pinMessage = vi
      .fn()
      .mockResolvedValue(fail({ type: "not-group-admin" }));
    const useCase = new PinMessageUseCase(makeMessagingRepo({ pinMessage }));

    const res = await useCase.execute("g1", "g1-2");

    expect(res).toEqual({ ok: false, failure: { type: "not-group-admin" } });
  });
});
