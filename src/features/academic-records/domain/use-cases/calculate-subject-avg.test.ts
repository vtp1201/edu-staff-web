import { describe, expect, it } from "vitest";
import type { SubjectColumnScore } from "../entities/academic-record.entity";
import { calculateSubjectAvg } from "./calculate-subject-avg";

function col(
  value: number | null,
  coefficient: number | null,
  columnId = `c-${value}-${coefficient}`,
): SubjectColumnScore {
  return {
    columnId,
    columnName: "col",
    columnType: "REGULAR",
    coefficient,
    value,
  };
}

describe("calculateSubjectAvg — dynamic snapshot columns (US-E18.54)", () => {
  it("weights each column by its own coefficient", () => {
    // (8×1 + 6×1 + 7×2 + 9×3) / 7 = 55/7 = 7.857… → 7.86
    expect(
      calculateSubjectAvg([col(8, 1), col(6, 1), col(7, 2), col(9, 3)]),
    ).toBe(7.86);
  });

  it("returns null for an empty column list", () => {
    expect(calculateSubjectAvg([])).toBeNull();
  });

  it("skips columns with a null value (frozen snapshot may be partial)", () => {
    // (8×1 + 9×3) / 4 = 35/4 = 8.75
    expect(calculateSubjectAvg([col(8, 1), col(null, 2), col(9, 3)])).toBe(
      8.75,
    );
  });

  it("returns null when every value is null", () => {
    expect(calculateSubjectAvg([col(null, 1), col(null, 3)])).toBeNull();
  });

  it("treats a null coefficient as weight 1 rather than dropping the column", () => {
    // (10×1 + 6×1) / 2 = 8
    expect(calculateSubjectAvg([col(10, null), col(6, 1)])).toBe(8);
  });

  it("returns null when the total weight is zero (all coefficients 0)", () => {
    expect(calculateSubjectAvg([col(8, 0), col(6, 0)])).toBeNull();
  });

  it("rounds to 2 decimals", () => {
    expect(calculateSubjectAvg([col(7, 1), col(8, 1), col(8, 1)])).toBe(7.67);
  });
});
