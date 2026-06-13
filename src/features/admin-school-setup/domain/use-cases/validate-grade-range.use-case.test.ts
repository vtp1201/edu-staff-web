import { describe, expect, it } from "vitest";
import {
  isNarrowingRange,
  validateGradeRange,
} from "./validate-grade-range.use-case";

describe("validateGradeRange", () => {
  it("returns required when minGrade is empty", () => {
    expect(validateGradeRange({ minGrade: "", maxGrade: 12 })).toBe("required");
  });
  it("returns required when maxGrade is empty", () => {
    expect(validateGradeRange({ minGrade: 1, maxGrade: "" })).toBe("required");
  });
  it("returns not-integer for decimal min", () => {
    expect(validateGradeRange({ minGrade: "1.5", maxGrade: 12 })).toBe(
      "not-integer",
    );
  });
  it("returns out-of-range when min < 1", () => {
    expect(validateGradeRange({ minGrade: 0, maxGrade: 12 })).toBe(
      "out-of-range",
    );
  });
  it("returns out-of-range when max > 13", () => {
    expect(validateGradeRange({ minGrade: 1, maxGrade: 14 })).toBe(
      "out-of-range",
    );
  });
  it("returns min-exceeds-max when min > max", () => {
    expect(validateGradeRange({ minGrade: 10, maxGrade: 5 })).toBe(
      "min-exceeds-max",
    );
  });
  it("returns null for valid range 1–13", () => {
    expect(validateGradeRange({ minGrade: 1, maxGrade: 13 })).toBeNull();
  });
  it("returns null for exact boundary min===max", () => {
    expect(validateGradeRange({ minGrade: 5, maxGrade: 5 })).toBeNull();
  });
});

describe("isNarrowingRange", () => {
  it("returns false when current is null", () => {
    expect(isNarrowingRange(null, { minGrade: 1, maxGrade: 5 })).toBe(false);
  });
  it("returns false when draft equals current", () => {
    expect(
      isNarrowingRange(
        { minGrade: 1, maxGrade: 12 },
        { minGrade: 1, maxGrade: 12 },
      ),
    ).toBe(false);
  });
  it("returns true when draft min increases", () => {
    expect(
      isNarrowingRange(
        { minGrade: 1, maxGrade: 12 },
        { minGrade: 3, maxGrade: 12 },
      ),
    ).toBe(true);
  });
  it("returns true when draft max decreases", () => {
    expect(
      isNarrowingRange(
        { minGrade: 1, maxGrade: 12 },
        { minGrade: 1, maxGrade: 10 },
      ),
    ).toBe(true);
  });
  it("returns false when draft widens range", () => {
    expect(
      isNarrowingRange(
        { minGrade: 3, maxGrade: 10 },
        { minGrade: 1, maxGrade: 12 },
      ),
    ).toBe(false);
  });
});
