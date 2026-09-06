import { describe, expect, it } from "vitest";
import {
  monthToDate,
  rateProgressColor,
  rateTone,
} from "./attendance-summary.utils";

/**
 * Design-spec `student-attendance.summary.statCards`:
 * `rate >= 95 ? success : rate >= 90 ? warning : error`.
 */
describe("rateTone", () => {
  it.each([
    [100, "success"],
    [95, "success"],
    [94.9, "warning"],
    [90, "warning"],
    [89.9, "error"],
    [0, "error"],
  ])("%s%% → %s", (rate, tone) => {
    expect(rateTone(rate)).toBe(tone);
  });

  /** No rate exists (0 recorded days) → a neutral card, never a red "0%". */
  it("null → muted (the card renders an em-dash, not a failing score)", () => {
    expect(rateTone(null)).toBe("muted");
  });
});

describe("rateProgressColor", () => {
  it("mirrors rateTone onto the ProgressBar's four fills", () => {
    expect(rateProgressColor(96)).toBe("success");
    expect(rateProgressColor(92)).toBe("warning");
    expect(rateProgressColor(50)).toBe("error");
  });

  it("null → primary (a neutral bar at 0%, not an alarming red one)", () => {
    expect(rateProgressColor(null)).toBe("primary");
  });
});

describe("monthToDate", () => {
  it("turns YYYY-MM into a noon-UTC instant in that month (timezone-stable)", () => {
    const date = monthToDate("2026-03");
    expect(date?.toISOString()).toBe("2026-03-01T12:00:00.000Z");
  });

  it("returns null for a non-month string rather than an Invalid Date", () => {
    expect(monthToDate("2026")).toBeNull();
    expect(monthToDate("not-a-month")).toBeNull();
    expect(monthToDate("2026-13")).toBeNull();
  });
});
