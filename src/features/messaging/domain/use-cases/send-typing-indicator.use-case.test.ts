import { describe, expect, it, vi } from "vitest";
import { makeMessagingRepo } from "./group-test-utils";
import { fail, ok } from "./result";
import { SendTypingIndicatorUseCase } from "./send-typing-indicator.use-case";

describe("SendTypingIndicatorUseCase", () => {
  it("delegates the typing flag to the repository", async () => {
    const sendTypingIndicator = vi.fn().mockResolvedValue(ok(true));
    const useCase = new SendTypingIndicatorUseCase(
      makeMessagingRepo({ sendTypingIndicator }),
    );

    const res = await useCase.execute("room-1", true);

    expect(sendTypingIndicator).toHaveBeenCalledWith("room-1", true);
    expect(res).toEqual({ ok: true, value: true });
  });

  it("returns a normal failure Result (never throws) on a rate-limit", async () => {
    const sendTypingIndicator = vi
      .fn()
      .mockResolvedValue(fail({ type: "typing-signal-failed", cause: "429" }));
    const useCase = new SendTypingIndicatorUseCase(
      makeMessagingRepo({ sendTypingIndicator }),
    );

    const res = await useCase.execute("room-1", false);

    expect(res).toEqual({
      ok: false,
      failure: { type: "typing-signal-failed", cause: "429" },
    });
  });
});
