import { describe, expect, it } from "vitest";
import { calculateSubjectAvg } from "./calculate-subject-avg";

describe("calculateSubjectAvg", () => {
  it("computes the weighted average across all four components", () => {
    // (8*1 + 9*1 + 7*2 + 10*3) / (1+1+2+3) = (8+9+14+30)/7 = 61/7 = 8.714…
    expect(calculateSubjectAvg(8, 9, 7, 10)).toBeCloseTo(8.71, 2);
  });

  it("excludes null components from sum and denominator", () => {
    // cuoiKy null → (8*1 + 9*1 + 7*2) / (1+1+2) = 31/4 = 7.75
    expect(calculateSubjectAvg(8, 9, 7, null)).toBe(7.75);
  });

  it("handles a single non-null score", () => {
    expect(calculateSubjectAvg(null, null, null, 6)).toBe(6);
  });

  it("returns null when all inputs are null", () => {
    expect(calculateSubjectAvg(null, null, null, null)).toBeNull();
  });

  it("rounds to two decimals", () => {
    // (10*1) / 1 = 10
    expect(calculateSubjectAvg(10, null, null, null)).toBe(10);
  });
});
