import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SSE_RECONNECT_DELAY_MS,
  scheduleReconnect,
} from "./schedule-reconnect";

/**
 * schedule-reconnect mirrors the DEF-01 timer contract of
 * highlight-timer.ts: a pending timer is always cleared before a new one is
 * scheduled, and the returned handle is reclaimable for unmount cleanup.
 * Tested with fake timers (node env, no DOM) — same pattern as
 * highlight-timer.test.ts.
 */
describe("scheduleReconnect (SSE 4s auto-reconnect timer)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onReconnect exactly once after 4000ms, not before", () => {
    const onReconnect = vi.fn();

    scheduleReconnect({ onReconnect, previousTimer: null });

    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS - 1);
    expect(onReconnect).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("clears a previous pending timer before scheduling a new one (no double-fire)", () => {
    const onReconnect = vi.fn();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const first = scheduleReconnect({ onReconnect, previousTimer: null });
    scheduleReconnect({ onReconnect, previousTimer: first });
    expect(clearSpy).toHaveBeenCalledWith(first);

    // Advancing past the delay fires only the second timer, once.
    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS);
    expect(onReconnect).toHaveBeenCalledTimes(1);

    clearSpy.mockRestore();
  });

  it("returns a reclaimable handle usable with clearTimeout (unmount cleanup)", () => {
    const onReconnect = vi.fn();

    const handle = scheduleReconnect({ onReconnect, previousTimer: null });
    clearTimeout(handle);

    vi.advanceTimersByTime(SSE_RECONNECT_DELAY_MS * 2);
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("honours a custom delayMs", () => {
    const onReconnect = vi.fn();

    scheduleReconnect({ onReconnect, previousTimer: null, delayMs: 500 });

    vi.advanceTimersByTime(499);
    expect(onReconnect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});
