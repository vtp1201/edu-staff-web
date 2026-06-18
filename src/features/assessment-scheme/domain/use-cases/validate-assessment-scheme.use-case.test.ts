import { describe, expect, it } from "vitest";
import type { AssessmentColumn } from "../entities/assessment-scheme.entity";
import { TT22_PRESET } from "../entities/assessment-scheme.entity";
import { validateAssessmentScheme } from "./validate-assessment-scheme.use-case";

describe("validateAssessmentScheme", () => {
  it("returns null for the TT22 preset (weights sum to 100)", () => {
    expect(validateAssessmentScheme(TT22_PRESET)).toBeNull();
  });

  it("returns EMPTY_COLUMNS when there are no columns", () => {
    expect(validateAssessmentScheme([])).toBe("EMPTY_COLUMNS");
  });

  it("returns WEIGHT_SUM_NOT_100 when weights sum to 90", () => {
    const columns: AssessmentColumn[] = [
      { id: "tx", type: "TX", label: "TX", count: 2, weight: 20 },
      { id: "gk", type: "GK", label: "GK", count: 1, weight: 30 },
      { id: "ck", type: "CK", label: "CK", count: 1, weight: 40 },
    ];
    expect(validateAssessmentScheme(columns)).toBe("WEIGHT_SUM_NOT_100");
  });

  it("returns INVALID_COUNT when a column count is 0", () => {
    const columns: AssessmentColumn[] = [
      { id: "tx", type: "TX", label: "TX", count: 0, weight: 50 },
      { id: "ck", type: "CK", label: "CK", count: 1, weight: 50 },
    ];
    expect(validateAssessmentScheme(columns)).toBe("INVALID_COUNT");
  });

  it("tolerates floating-point weight sums that round to 100", () => {
    const columns: AssessmentColumn[] = [
      { id: "a", type: "TX", label: "A", count: 1, weight: 33.33 },
      { id: "b", type: "TX", label: "B", count: 1, weight: 33.33 },
      { id: "c", type: "CK", label: "C", count: 1, weight: 33.34 },
    ];
    expect(validateAssessmentScheme(columns)).toBeNull();
  });
});
