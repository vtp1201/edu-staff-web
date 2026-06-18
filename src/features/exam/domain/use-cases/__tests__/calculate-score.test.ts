import { describe, expect, it } from "vitest";
import { calculateScore, scoreColorClass } from "../../calculate-score";

describe("calculateScore", () => {
  it("15/20 = 7.5", () => {
    expect(calculateScore(15, 20)).toBe(7.5);
  });
  it("20/20 = 10", () => {
    expect(calculateScore(20, 20)).toBe(10);
  });
  it("0/20 = 0", () => {
    expect(calculateScore(0, 20)).toBe(0);
  });
  it("0/0 = 0 (no division by zero)", () => {
    expect(calculateScore(0, 0)).toBe(0);
  });
});

describe("scoreColorClass", () => {
  it("8 → success", () => {
    expect(scoreColorClass(8)).toBe("text-edu-success-text");
  });
  it("9.5 → success", () => {
    expect(scoreColorClass(9.5)).toBe("text-edu-success-text");
  });
  it("5 → primary", () => {
    expect(scoreColorClass(5)).toBe("text-primary");
  });
  it("7.5 → primary", () => {
    expect(scoreColorClass(7.5)).toBe("text-primary");
  });
  it("4.9 → error", () => {
    expect(scoreColorClass(4.9)).toBe("text-edu-error-text");
  });
  it("0 → error", () => {
    expect(scoreColorClass(0)).toBe("text-edu-error-text");
  });
});
