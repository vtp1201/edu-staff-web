import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CooldownController } from "./cooldown-controller";

describe("CooldownController", () => {
  let clock = 0;
  const now = () => clock;

  beforeEach(() => {
    clock = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is actionable (0) before any start()", () => {
    const c = new CooldownController({ now });
    expect(c.getRemaining()).toBe(0);
  });

  it("starts at the full duration on start()", () => {
    const c = new CooldownController({ now });
    c.start();
    expect(c.getRemaining()).toBe(60);
  });

  it("ticks down each second", () => {
    const c = new CooldownController({ now });
    c.start();
    clock = 1000;
    vi.advanceTimersByTime(1000);
    expect(c.getRemaining()).toBe(59);
    clock = 5000;
    vi.advanceTimersByTime(4000);
    expect(c.getRemaining()).toBe(55);
  });

  it("clamps to 0 at expiry and never goes negative", () => {
    const c = new CooldownController({ now });
    c.start();
    clock = 60000;
    vi.advanceTimersByTime(60000);
    expect(c.getRemaining()).toBe(0);
    clock = 90000;
    vi.advanceTimersByTime(30000);
    expect(c.getRemaining()).toBe(0);
  });

  it("start() mid-cooldown resets to a fresh full window (Resend)", () => {
    const c = new CooldownController({ now });
    c.start();
    clock = 30000;
    vi.advanceTimersByTime(30000);
    expect(c.getRemaining()).toBe(30);
    c.start(); // Resend
    expect(c.getRemaining()).toBe(60);
  });

  it("notifies subscribers on tick", () => {
    const c = new CooldownController({ now });
    const cb = vi.fn();
    c.subscribe(cb);
    c.start();
    expect(cb).toHaveBeenCalled();
    cb.mockClear();
    clock = 1000;
    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalled();
  });

  it("respects a custom duration", () => {
    const c = new CooldownController({ now, durationSeconds: 10 });
    c.start();
    expect(c.getRemaining()).toBe(10);
  });

  it("stops its timer once expired (no leak)", () => {
    const c = new CooldownController({ now });
    c.start();
    const cb = vi.fn();
    c.subscribe(cb);
    clock = 60000;
    vi.advanceTimersByTime(60000);
    cb.mockClear();
    clock = 61000;
    vi.advanceTimersByTime(1000);
    // Timer cleared at expiry → no further notifications.
    expect(cb).not.toHaveBeenCalled();
  });
});
