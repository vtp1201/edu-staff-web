import { describe, expect, it } from "vitest";
import type { GradeScaleBand } from "../entities/grade-scale.entity";
import { GRADE_SCALE_PRESETS } from "../entities/grade-scale.entity";
import { validateGradeScale } from "./validate-grade-scale.use-case";

describe("validateGradeScale", () => {
  it("returns null for a valid SCALE_10 preset", () => {
    const { bands, maxScore } = GRADE_SCALE_PRESETS.SCALE_10;
    expect(validateGradeScale(bands, maxScore, "SCALE_10")).toBeNull();
  });

  it("returns null for a valid SCALE_4 preset", () => {
    const { bands, maxScore } = GRADE_SCALE_PRESETS.SCALE_4;
    expect(validateGradeScale(bands, maxScore, "SCALE_4")).toBeNull();
  });

  it("returns null for a valid LETTER preset", () => {
    const { bands, maxScore } = GRADE_SCALE_PRESETS.LETTER;
    expect(validateGradeScale(bands, maxScore, "LETTER")).toBeNull();
  });

  it("returns EMPTY_BANDS for empty bands", () => {
    expect(validateGradeScale([], 10, "SCALE_10")).toBe("EMPTY_BANDS");
  });

  it("returns LOWEST_BAND_NOT_ZERO when lowest band does not start at 0", () => {
    const bands: GradeScaleBand[] = [
      { id: "hi", label: "Hi", minThreshold: 5, colorToken: "success" },
      { id: "lo", label: "Lo", minThreshold: 1, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10, "SCALE_10")).toBe(
      "LOWEST_BAND_NOT_ZERO",
    );
  });

  it("returns OVERLAPPING_THRESHOLDS for duplicate thresholds", () => {
    const bands: GradeScaleBand[] = [
      { id: "a", label: "A", minThreshold: 5, colorToken: "success" },
      { id: "b", label: "B", minThreshold: 5, colorToken: "primary" },
      { id: "c", label: "C", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10, "SCALE_10")).toBe(
      "OVERLAPPING_THRESHOLDS",
    );
  });

  it("returns GAPS_IN_COVERAGE when the top band exceeds maxScore", () => {
    // A band whose minThreshold is >= maxScore means it covers nothing valid.
    const bands: GradeScaleBand[] = [
      { id: "a", label: "A", minThreshold: 12, colorToken: "success" },
      { id: "b", label: "B", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10, "SCALE_10")).toBe("GAPS_IN_COVERAGE");
  });

  it("returns null for a single band covering 0..max", () => {
    const bands: GradeScaleBand[] = [
      { id: "all", label: "Đạt", minThreshold: 0, colorToken: "success" },
    ];
    expect(validateGradeScale(bands, 10, "SCALE_10")).toBeNull();
  });
});

/**
 * US-E18.49 — client-side mirror of the BE's `422 GRADE_SCALE_INVALID_BANDS`
 * rules (`services/core/.../entity/grade_scale.go` `validateBands`), so an admin
 * gets a specific message instead of the one generic server code.
 */
describe("validateGradeScale — band rules mirroring GRADE_SCALE_INVALID_BANDS", () => {
  /** n bands, strictly decreasing, lowest at 0 — otherwise valid. */
  function ladder(n: number, maxScore = 10): GradeScaleBand[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `b${i}`,
      label: `B${i}`,
      // highest-first: index 0 gets the biggest threshold, last gets 0
      minThreshold: ((n - 1 - i) * (maxScore - 1)) / (n - 1),
      colorToken: "primary" as const,
    }));
  }

  it("accepts exactly 10 bands on a numeric scale", () => {
    expect(validateGradeScale(ladder(10), 10, "SCALE_10")).toBeNull();
  });

  it("returns TOO_MANY_BANDS for an 11th band on a numeric scale (BE maxItems 10)", () => {
    expect(validateGradeScale(ladder(11), 10, "SCALE_10")).toBe(
      "TOO_MANY_BANDS",
    );
    expect(validateGradeScale(ladder(11), 4, "SCALE_4")).toBe("TOO_MANY_BANDS");
  });

  it("does NOT cap a LETTER scale at 10 (letterGrades allows up to 64 on the wire)", () => {
    expect(validateGradeScale(ladder(11, 100), 100, "LETTER")).toBeNull();
  });

  it("returns BAND_LABEL_REQUIRED for an empty / whitespace-only label", () => {
    const bands: GradeScaleBand[] = [
      { id: "a", label: "A", minThreshold: 5, colorToken: "success" },
      { id: "b", label: "   ", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10, "SCALE_10")).toBe(
      "BAND_LABEL_REQUIRED",
    );
  });

  it("returns BAND_LABEL_TOO_LONG past 32 characters (BE maxLength 32)", () => {
    const bands: GradeScaleBand[] = [
      {
        id: "a",
        label: "A".repeat(32),
        minThreshold: 5,
        colorToken: "success",
      },
      { id: "b", label: "B", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(bands, 10, "SCALE_10")).toBeNull();

    const tooLong: GradeScaleBand[] = [
      {
        id: "a",
        label: "A".repeat(33),
        minThreshold: 5,
        colorToken: "success",
      },
      { id: "b", label: "B", minThreshold: 0, colorToken: "error" },
    ];
    expect(validateGradeScale(tooLong, 10, "SCALE_10")).toBe(
      "BAND_LABEL_TOO_LONG",
    );
  });
});
