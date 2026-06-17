import { describe, expect, it } from "vitest";
import type { ViolationSeverity } from "../entities/violation.entity";
import { CalculateConductPointsUseCase } from "./calculate-conduct-points.use-case";

function severities(list: ViolationSeverity[]) {
  return list.map((severity) => ({ severity }));
}

describe("CalculateConductPointsUseCase", () => {
  const useCase = new CalculateConductPointsUseCase();

  it("returns 100 / excellent for no violations", () => {
    expect(useCase.execute([])).toEqual({ points: 100, grade: "excellent" });
  });

  it("deducts -1 per low violation (2 low → 98 / excellent)", () => {
    expect(useCase.execute(severities(["low", "low"]))).toEqual({
      points: 98,
      grade: "excellent",
    });
  });

  it("deducts -3 per medium violation (5 medium → 85 / good)", () => {
    expect(
      useCase.execute(
        severities(["medium", "medium", "medium", "medium", "medium"]),
      ),
    ).toEqual({ points: 85, grade: "good" });
  });

  it("crosses into good band (20 low → 80 / good)", () => {
    expect(useCase.execute(severities(Array(20).fill("low")))).toEqual({
      points: 80,
      grade: "good",
    });
  });

  it("crosses into average band (>=50, <70)", () => {
    // 18 medium = -54 → 46? use mix: 15 medium = -45 → 55 average
    expect(useCase.execute(severities(Array(15).fill("medium")))).toEqual({
      points: 55,
      grade: "average",
    });
  });

  it("falls to poor band (<50)", () => {
    // 12 high = -60 → 40 poor
    expect(useCase.execute(severities(Array(12).fill("high")))).toEqual({
      points: 40,
      grade: "poor",
    });
  });

  it("floors at 0 and never goes negative", () => {
    const result = useCase.execute(severities(Array(50).fill("high")));
    expect(result.points).toBe(0);
    expect(result.grade).toBe("poor");
  });
});
