import { describe, expect, it } from "vitest";
import {
  isInvalidRange,
  isNoTerms,
  isSummaryRange,
  resolveSummaryRange,
  type SummaryYear,
  termsOf,
} from "./resolve-summary-range";

const YEARS: SummaryYear[] = [
  {
    isActive: false,
    terms: [
      {
        id: "t-old",
        name: "Học kỳ I (2024-2025)",
        startDate: "2024-09-01",
        endDate: "2025-01-15",
      },
    ],
  },
  {
    isActive: true,
    terms: [
      {
        id: "t1",
        name: "Học kỳ I",
        startDate: "2025-09-01",
        endDate: "2026-01-15",
      },
      {
        id: "t2",
        name: "Học kỳ II",
        startDate: "2026-01-16",
        endDate: "2026-05-31",
      },
    ],
  },
];

describe("termsOf", () => {
  it("returns only the ACTIVE year's terms, in wire order", () => {
    expect(termsOf(YEARS).map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("returns [] when there is no active year", () => {
    expect(termsOf([{ isActive: false, terms: [] }])).toEqual([]);
  });

  it("drops terms whose dates are not ISO days", () => {
    expect(
      termsOf([
        {
          isActive: true,
          terms: [
            { id: "bad", name: "?", startDate: "", endDate: "2026-01-01" },
            {
              id: "ok",
              name: "HK",
              startDate: "2026-01-01",
              endDate: "2026-02-01",
            },
          ],
        },
      ]).map((t) => t.id),
    ).toEqual(["ok"]);
  });
});

describe("resolveSummaryRange — month", () => {
  it("is the current calendar month, clamped to today", () => {
    const result = resolveSummaryRange("month", "2026-04-17", []);
    expect(result).toEqual({ startDate: "2026-04-01", endDate: "2026-04-17" });
  });

  it("keeps the whole month when today is its last day", () => {
    expect(resolveSummaryRange("month", "2026-02-28", [])).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  it("uses a full past month when one is selected", () => {
    expect(
      resolveSummaryRange("month", "2026-04-17", [], { month: "2026-02" }),
      // 2026 is not a leap year — February ends on the 28th.
    ).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
  });

  it("needs NO terms at all", () => {
    expect(isSummaryRange(resolveSummaryRange("month", "2026-04-17", []))).toBe(
      true,
    );
  });

  it("rejects a month that has not started yet as a SELECTION problem", () => {
    // Not "too large" — the span is a month. Conflating the two showed the
    // "over 366 days" copy for a future month (reviewer SHOULD-FIX #1).
    expect(
      resolveSummaryRange("month", "2026-04-17", [], { month: "2026-06" }),
    ).toEqual({ type: "invalid-request", reason: "invalid-selection" });
  });

  it("rejects a malformed month param instead of guessing", () => {
    expect(
      resolveSummaryRange("month", "2026-04-17", [], { month: "abril" }),
    ).toEqual({ type: "invalid-request", reason: "invalid-selection" });
  });
});

describe("resolveSummaryRange — term", () => {
  it("defaults to the term containing today", () => {
    expect(resolveSummaryRange("term", "2026-03-02", YEARS)).toEqual({
      startDate: "2026-01-16",
      endDate: "2026-05-31",
    });
  });

  it("honours an explicitly selected term of the active year", () => {
    expect(
      resolveSummaryRange("term", "2026-03-02", YEARS, { termId: "t1" }),
    ).toEqual({ startDate: "2025-09-01", endDate: "2026-01-15" });
  });

  it("falls back to the last term of the active year between terms", () => {
    // Summer: today is after every term of the active year.
    expect(resolveSummaryRange("term", "2026-07-01", YEARS)).toEqual({
      startDate: "2026-01-16",
      endDate: "2026-05-31",
    });
  });

  it("degrades to the no-terms sentinel when the calendar is unavailable", () => {
    const result = resolveSummaryRange("term", "2026-03-02", []);
    expect(isNoTerms(result)).toBe(true);
    expect(result).toEqual({ type: "no-terms" });
  });

  it("ignores a selected term id that belongs to an inactive year", () => {
    expect(
      resolveSummaryRange("term", "2026-03-02", YEARS, { termId: "t-old" }),
    ).toEqual({ startDate: "2026-01-16", endDate: "2026-05-31" });
  });
});

describe("resolveSummaryRange — year", () => {
  it("spans the active year's terms, clamped to today", () => {
    // AcademicYear carries no year-level dates: bounds come from its terms.
    expect(resolveSummaryRange("year", "2026-03-02", YEARS)).toEqual({
      startDate: "2025-09-01",
      endDate: "2026-03-02",
    });
  });

  it("stops at the last term's end once the year is over", () => {
    expect(resolveSummaryRange("year", "2026-08-30", YEARS)).toEqual({
      startDate: "2025-09-01",
      endDate: "2026-05-31",
    });
  });

  it("degrades to the no-terms sentinel when the active year has no term", () => {
    expect(
      resolveSummaryRange("year", "2026-03-02", [
        { isActive: true, terms: [] },
      ]),
    ).toEqual({ type: "no-terms" });
  });

  it("rejects an over-366-day span after the clamp (no wire call)", () => {
    const longYear: SummaryYear[] = [
      {
        isActive: true,
        terms: [
          {
            id: "long",
            name: "Kỳ dài",
            startDate: "2025-01-01",
            endDate: "2026-12-31",
          },
        ],
      },
    ];
    // 2025-01-01 → 2026-06-01 = 517 days.
    expect(resolveSummaryRange("year", "2026-06-01", longYear)).toEqual({
      type: "invalid-request",
      reason: "too-large",
    });
  });

  it("accepts exactly 366 days", () => {
    const leapish: SummaryYear[] = [
      {
        isActive: true,
        terms: [
          {
            id: "y",
            name: "Kỳ",
            startDate: "2025-06-01",
            endDate: "2026-12-31",
          },
        ],
      },
    ];
    // 2025-06-01 → 2026-06-01 inclusive = 366 days.
    expect(resolveSummaryRange("year", "2026-06-01", leapish)).toEqual({
      startDate: "2025-06-01",
      endDate: "2026-06-01",
    });
  });

  it("rejects an over-366-day term the same way", () => {
    const longTerm: SummaryYear[] = [
      {
        isActive: true,
        terms: [
          {
            id: "long",
            name: "Kỳ dài",
            startDate: "2024-01-01",
            endDate: "2026-12-31",
          },
        ],
      },
    ];
    expect(resolveSummaryRange("term", "2026-06-01", longTerm)).toEqual({
      type: "invalid-request",
      reason: "too-large",
    });
  });
});

describe("resolveSummaryRange — determinism", () => {
  it("never reads the real clock: the same today always gives the same range", () => {
    const a = resolveSummaryRange("month", "2026-04-17", YEARS);
    const b = resolveSummaryRange("month", "2026-04-17", YEARS);
    expect(a).toEqual(b);
  });
});

describe("resolveSummaryRange — invalid-range reasons are distinguishable", () => {
  it("tells an over-366-day span apart from an unusable selection", () => {
    const tooLarge = resolveSummaryRange("year", "2026-06-01", [
      {
        isActive: true,
        terms: [
          {
            id: "long",
            name: "Kỳ dài",
            startDate: "2025-01-01",
            endDate: "2026-12-31",
          },
        ],
      },
    ]);
    const futureMonth = resolveSummaryRange("month", "2026-04-17", [], {
      month: "2027-01",
    });

    expect(isInvalidRange(tooLarge)).toBe(true);
    expect(isInvalidRange(futureMonth)).toBe(true);
    // The whole point: the UI can no longer blame "366 days" for a future
    // month — the two reasons are not equal.
    expect(isInvalidRange(tooLarge) && tooLarge.reason).toBe("too-large");
    expect(isInvalidRange(futureMonth) && futureMonth.reason).toBe(
      "invalid-selection",
    );
  });

  it("reports an inverted range as an unusable selection, not an oversize one", () => {
    const inverted = resolveSummaryRange("term", "2026-03-02", [
      {
        isActive: true,
        terms: [
          {
            id: "backwards",
            name: "Kỳ ngược",
            startDate: "2026-05-31",
            endDate: "2026-01-16",
          },
        ],
      },
    ]);
    expect(inverted).toEqual({
      type: "invalid-request",
      reason: "invalid-selection",
    });
  });

  it("narrows away from a usable range", () => {
    const ok = resolveSummaryRange("month", "2026-04-17", []);
    expect(isInvalidRange(ok)).toBe(false);
    expect(isSummaryRange(ok)).toBe(true);
  });
});
