import { describe, expect, it } from "vitest";
import { fallbackRange, termRangeFor } from "./resolve-student-range";

const TODAY = "2026-09-06";

const YEARS = [
  {
    isActive: false,
    terms: [{ startDate: "2025-09-01", endDate: "2026-01-15" }],
  },
  {
    isActive: true,
    terms: [
      { startDate: "2026-08-15", endDate: "2026-12-31" },
      { startDate: "2027-01-05", endDate: "2027-05-30" },
    ],
  },
];

describe("termRangeFor", () => {
  it("picks the ACTIVE year's term that contains today", () => {
    expect(termRangeFor(YEARS, TODAY)).toEqual({
      startDate: "2026-08-15",
      endDate: "2026-12-31",
    });
  });

  it("ignores terms of a non-active year even when they contain today", () => {
    expect(
      termRangeFor(
        [
          {
            isActive: false,
            terms: [{ startDate: "2026-09-01", endDate: "2026-09-30" }],
          },
        ],
        TODAY,
      ),
    ).toBeNull();
  });

  it("returns null when no term of the active year contains today (between terms)", () => {
    expect(termRangeFor(YEARS, "2027-01-02")).toBeNull();
  });

  it("returns null for an empty / unreadable year list", () => {
    expect(termRangeFor([], TODAY)).toBeNull();
    expect(termRangeFor([{ isActive: true, terms: [] }], TODAY)).toBeNull();
  });

  /** The BE caps the attendance read at 366 days — a longer term is unusable. */
  it("returns null when the term is longer than the 366-day read cap", () => {
    expect(
      termRangeFor(
        [
          {
            isActive: true,
            terms: [{ startDate: "2026-01-01", endDate: "2027-06-30" }],
          },
        ],
        TODAY,
      ),
    ).toBeNull();
  });

  it("returns null on a malformed term date rather than a broken range", () => {
    expect(
      termRangeFor(
        [
          {
            isActive: true,
            terms: [{ startDate: "hôm nay", endDate: "2026-12-31" }],
          },
        ],
        TODAY,
      ),
    ).toBeNull();
  });
});

describe("fallbackRange", () => {
  it("is the six months up to today (well inside the 366-day cap)", () => {
    expect(fallbackRange(TODAY)).toEqual({
      startDate: "2026-03-06",
      endDate: "2026-09-06",
    });
  });

  it("crosses a year boundary correctly", () => {
    expect(fallbackRange("2026-02-15")).toEqual({
      startDate: "2025-08-15",
      endDate: "2026-02-15",
    });
  });

  /** 31 Aug − 6 months = 28/29 Feb, not an overflowed 2/3 March. */
  it("clamps a day that does not exist in the target month", () => {
    expect(fallbackRange("2026-08-31").startDate).toBe("2026-02-28");
  });
});
