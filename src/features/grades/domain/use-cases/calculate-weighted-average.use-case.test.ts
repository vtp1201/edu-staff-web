import { describe, expect, it } from "vitest";
import type { AssessmentColumn } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import { calculateWeightedAverage } from "./calculate-weighted-average.use-case";

const cols: AssessmentColumn[] = [
  { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
  { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
  { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
];

describe("calculateWeightedAverage", () => {
  it("computes weighted average when all scores present", () => {
    // 8*20 + 7*30 + 9*50 = 160 + 210 + 450 = 820 / 100 = 8.2
    const result = calculateWeightedAverage({ tx: 8, gk: 7, ck: 9 }, cols);
    expect(result).toBe(8.2);
  });

  it("returns null when any column score is null", () => {
    const result = calculateWeightedAverage({ tx: 8, gk: null, ck: 9 }, cols);
    expect(result).toBeNull();
  });

  it("returns null when a column key is missing entirely", () => {
    const result = calculateWeightedAverage({ tx: 8, gk: 7 }, cols);
    expect(result).toBeNull();
  });

  it("handles a single column", () => {
    const single: AssessmentColumn[] = [
      { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 100 },
    ];
    expect(calculateWeightedAverage({ ck: 6.5 }, single)).toBe(6.5);
  });

  it("rounds to 1 decimal place", () => {
    // 7*20 + 8*30 + 8*50 = 140 + 240 + 400 = 780 / 100 = 7.8 → exact
    // use weights that produce repeating: 1/3 each, scores 7,8,9 → 8.0
    const thirds: AssessmentColumn[] = [
      { id: "a", type: "TX", label: "A", count: 1, weight: 1 },
      { id: "b", type: "TX", label: "B", count: 1, weight: 1 },
      { id: "c", type: "TX", label: "C", count: 1, weight: 1 },
    ];
    // (7+8+8)/3 = 7.666... → 7.7
    expect(calculateWeightedAverage({ a: 7, b: 8, c: 8 }, thirds)).toBe(7.7);
  });

  it("computes correctly when weights do not sum to 100", () => {
    const odd: AssessmentColumn[] = [
      { id: "a", type: "TX", label: "A", count: 1, weight: 10 },
      { id: "b", type: "GK", label: "B", count: 1, weight: 30 },
    ];
    // (5*10 + 9*30) / 40 = (50 + 270) / 40 = 320/40 = 8.0
    expect(calculateWeightedAverage({ a: 5, b: 9 }, odd)).toBe(8);
  });

  it("handles a zero score", () => {
    // 0*20 + 0*30 + 0*50 = 0
    expect(calculateWeightedAverage({ tx: 0, gk: 0, ck: 0 }, cols)).toBe(0);
  });
});
