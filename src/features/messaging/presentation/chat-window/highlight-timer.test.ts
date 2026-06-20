import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HIGHLIGHT_DURATION_MS,
  scheduleHighlightClear,
} from "./highlight-timer";

describe("scheduleHighlightClear (DEF-01 timer contract)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies the highlight immediately and clears it after the duration", () => {
    const setHighlightId = vi.fn();

    const handle = scheduleHighlightClear({
      messageId: "g1-2",
      setHighlightId,
      previousTimer: null,
    });

    // Highlight applied synchronously.
    expect(setHighlightId).toHaveBeenCalledExactlyOnceWith("g1-2");
    expect(handle).toBeDefined();

    // Not cleared before the duration elapses.
    vi.advanceTimersByTime(HIGHLIGHT_DURATION_MS - 1);
    expect(setHighlightId).toHaveBeenCalledTimes(1);

    // Cleared exactly when the duration elapses.
    vi.advanceTimersByTime(1);
    expect(setHighlightId).toHaveBeenCalledTimes(2);
    expect(setHighlightId).toHaveBeenLastCalledWith(null);
  });

  it("clears a pending timer before scheduling a new one (rapid clicks, no leak)", () => {
    const setHighlightId = vi.fn();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const first = scheduleHighlightClear({
      messageId: "g1-2",
      setHighlightId,
      previousTimer: null,
    });

    // Second click before the first timer fires must clear the first timer.
    scheduleHighlightClear({
      messageId: "g1-5",
      setHighlightId,
      previousTimer: first,
    });
    expect(clearSpy).toHaveBeenCalledWith(first);

    // Advancing past the original delay must NOT fire the cleared first timer —
    // only the second timer's single clear runs.
    setHighlightId.mockClear();
    vi.advanceTimersByTime(HIGHLIGHT_DURATION_MS);
    expect(setHighlightId).toHaveBeenCalledExactlyOnceWith(null);

    clearSpy.mockRestore();
  });

  it("returns a reclaimable handle so the caller can clear it on unmount", () => {
    const setHighlightId = vi.fn();

    const handle = scheduleHighlightClear({
      messageId: "g1-2",
      setHighlightId,
      previousTimer: null,
    });

    // Simulate the unmount cleanup: caller clears the stored handle.
    clearTimeout(handle);
    setHighlightId.mockClear();

    // After unmount cleanup the timer never fires → no setState on unmounted.
    vi.advanceTimersByTime(HIGHLIGHT_DURATION_MS * 2);
    expect(setHighlightId).not.toHaveBeenCalled();
  });

  it("honours a custom duration", () => {
    const setHighlightId = vi.fn();

    scheduleHighlightClear({
      messageId: "g1-2",
      setHighlightId,
      previousTimer: null,
      durationMs: 500,
    });

    setHighlightId.mockClear();
    vi.advanceTimersByTime(499);
    expect(setHighlightId).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(setHighlightId).toHaveBeenCalledExactlyOnceWith(null);
  });
});
