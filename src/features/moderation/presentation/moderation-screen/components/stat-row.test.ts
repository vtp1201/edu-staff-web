import { describe, expect, it } from "vitest";
import { statRowMode } from "./stat-row";

/**
 * A terminally-failed stats read must NOT keep rendering the loading skeleton
 * (review MUST-FIX, US-E18.32): once the query settles in error, `isLoading` is
 * false and `data` stays undefined forever, so "still loading" would be a lie.
 * Same principle as `UnavailableValue` / `initialStats: null` — missing data is
 * never disguised as something else.
 */
describe("statRowMode", () => {
  it("renders the counters whenever real stats exist (even mid-refetch)", () => {
    expect(
      statRowMode({ hasStats: true, isLoading: false, hasError: false }),
    ).toBe("ready");
    // A background refetch after a transient error keeps the last real values.
    expect(
      statRowMode({ hasStats: true, isLoading: true, hasError: true }),
    ).toBe("ready");
  });

  it("shows the skeleton ONLY for a genuine in-flight first read", () => {
    expect(
      statRowMode({ hasStats: false, isLoading: true, hasError: false }),
    ).toBe("loading");
  });

  it("shows the unavailable marker when the stats read failed terminally", () => {
    // e.g. `forbidden` (non-retryable) or a transient error past its retries.
    expect(
      statRowMode({ hasStats: false, isLoading: false, hasError: true }),
    ).toBe("unavailable");
    // An error wins over a queued retry: never re-enter an endless skeleton.
    expect(
      statRowMode({ hasStats: false, isLoading: true, hasError: true }),
    ).toBe("unavailable");
  });

  it("treats a settled read with no data as unavailable, not loading", () => {
    expect(
      statRowMode({ hasStats: false, isLoading: false, hasError: false }),
    ).toBe("unavailable");
  });
});
