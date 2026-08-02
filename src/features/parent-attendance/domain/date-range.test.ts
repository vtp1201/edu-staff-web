import { describe, expect, it } from "vitest";
import { currentMonthRange, daysInclusive, enumerateDates } from "./date-range";

describe("enumerateDates", () => {
  it("includes both endpoints, ascending", () => {
    expect(enumerateDates("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("returns a single day for an equal range and nothing for an inverted one", () => {
    expect(enumerateDates("2026-08-01", "2026-08-01")).toEqual(["2026-08-01"]);
    expect(enumerateDates("2026-08-02", "2026-08-01")).toEqual([]);
  });
});

describe("daysInclusive", () => {
  it("counts both endpoints", () => {
    expect(daysInclusive("2026-08-01", "2026-08-01")).toBe(1);
    expect(daysInclusive("2026-08-01", "2026-08-31")).toBe(31);
  });

  it("is DST-proof (UTC-anchored) across a spring-forward boundary", () => {
    expect(daysInclusive("2026-03-01", "2026-03-31")).toBe(31);
  });

  it("counts a leap year as 366 days", () => {
    expect(daysInclusive("2024-01-01", "2024-12-31")).toBe(366);
    expect(daysInclusive("2025-01-01", "2025-12-31")).toBe(365);
  });
});

describe("currentMonthRange", () => {
  it("returns the first and last day of a 31-day month", () => {
    expect(currentMonthRange("2026-08-14")).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
  });

  it("handles February in a leap year and a common year", () => {
    expect(currentMonthRange("2024-02-10").endDate).toBe("2024-02-29");
    expect(currentMonthRange("2025-02-10").endDate).toBe("2025-02-28");
  });

  it("handles December (month rollover)", () => {
    expect(currentMonthRange("2026-12-31")).toEqual({
      startDate: "2026-12-01",
      endDate: "2026-12-31",
    });
  });
});
