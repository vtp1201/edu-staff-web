import { describe, expect, it, vi } from "vitest";
import { createTypingThrottle } from "./typing-throttle";

describe("createTypingThrottle", () => {
  it("fires immediately on the first call (leading edge)", () => {
    const send = vi.fn();
    const t = 0;
    const throttle = createTypingThrottle(send, {
      intervalMs: 2000,
      now: () => t,
    });

    throttle.fire();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("suppresses calls inside the cooldown, then fires again after it", () => {
    const send = vi.fn();
    let t = 0;
    const throttle = createTypingThrottle(send, {
      intervalMs: 2000,
      now: () => t,
    });

    throttle.fire(); // t=0 → fire
    t = 500;
    throttle.fire(); // inside cooldown → suppressed
    t = 1999;
    throttle.fire(); // still inside → suppressed
    expect(send).toHaveBeenCalledTimes(1);

    t = 2000;
    throttle.fire(); // cooldown elapsed → fire
    expect(send).toHaveBeenCalledTimes(2);
  });
});
