import { describe, expect, it } from "vitest";
import { validateScore } from "./validate-score.use-case";

describe("validateScore", () => {
  it("accepts 0 on SCALE_10", () => {
    expect(validateScore(0, 10)).toEqual({ valid: true });
  });

  it("accepts max score 10 on SCALE_10", () => {
    expect(validateScore(10, 10)).toEqual({ valid: true });
  });

  it("accepts a 1-decimal value 7.5", () => {
    expect(validateScore(7.5, 10)).toEqual({ valid: true });
  });

  it("rejects a negative score", () => {
    const result = validateScore(-1, 10);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failure.type).toBe("invalid-value");
    }
  });

  it("rejects 10.1 on SCALE_10", () => {
    const result = validateScore(10.1, 10);
    expect(result.valid).toBe(false);
    if (!result.valid && result.failure.type === "invalid-value") {
      expect(result.failure.maxScore).toBe(10);
    }
  });

  it("accepts 4.0 on SCALE_4", () => {
    expect(validateScore(4, 4)).toEqual({ valid: true });
  });
});
