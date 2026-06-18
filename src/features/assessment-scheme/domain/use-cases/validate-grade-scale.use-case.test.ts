import { describe, expect, it } from "vitest";
import type { GradeScaleBand } from "../entities/grade-scale.entity";
import { GRADE_SCALE_PRESETS } from "../entities/grade-scale.entity";
import { validateGradeScale } from "./validate-grade-scale.use-case";

describe("validateGradeScale", () => {
  it("returns null for a valid SCALE_10 preset", () => {
    const { bands, maxScore } = GRADE_SCALE_PRESETS.SCALE_10;
    expect(validateGradeScale(bands, maxScore)).toBeNull();
  });

  it("returns null for a valid SCALE_4 preset", () => {
    const { bands, maxScore } = GRADE_SCALE_PRESETS.SCALE_4;
    expect(validateGradeScale(bands, maxScore)).toBeNull();
  });

  it("returns null for a valid LETTER preset", () => {
    const { bands, maxScore } = GRADE_SCALE_PRESETS.LETTER;
    expect(validateGradeScale(bands, maxScore)).toBeNull();
  });

  it("returns EMPTY_BANDS for empty bands", () => {
    expect(validateGradeScale([], 10)).toBe("EMPTY_BANDS");
  });

  it("returns LOWEST_BAND_NOT_ZERO when lowest band does not start at 0", () => {
    const bands: GradeScaleBand[] = [
      { id: "hi", label: "Hi", minThreshold: 5, colorToken: "success" },
      { id: "lo", label: "Lo", minThreshold: 1, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10)).toBe("LOWEST_BAND_NOT_ZERO");
  });

  it("returns OVERLAPPING_THRESHOLDS for duplicate thresholds", () => {
    const bands: GradeScaleBand[] = [
      { id: "a", label: "A", minThreshold: 5, colorToken: "success" },
      { id: "b", label: "B", minThreshold: 5, colorToken: "primary" },
      { id: "c", label: "C", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10)).toBe("OVERLAPPING_THRESHOLDS");
  });

  it("returns GAPS_IN_COVERAGE when the top band exceeds maxScore", () => {
    // A band whose minThreshold is >= maxScore means it covers nothing valid.
    const bands: GradeScaleBand[] = [
      { id: "a", label: "A", minThreshold: 12, colorToken: "success" },
      { id: "b", label: "B", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10)).toBe("GAPS_IN_COVERAGE");
  });

  it("returns null for a single band covering 0..max", () => {
    const bands: GradeScaleBand[] = [
      { id: "all", label: "Đạt", minThreshold: 0, colorToken: "success" },
    ];
    expect(validateGradeScale(bands, 10)).toBeNull();
  });
});
