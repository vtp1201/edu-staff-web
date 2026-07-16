import { describe, expect, it } from "vitest";
import type { GradeBookRow } from "../entities/grade-book.entity";
import { calculateRankDistribution } from "./rank-distribution";

function row(average: number | null): GradeBookRow {
  return {
    studentId: `s-${Math.random()}`,
    studentName: "x",
    studentCode: "X",
    scores: {},
    average,
    conductGrade: "Tot",
  };
}

describe("calculateRankDistribution", () => {
  it("returns all-zero bands for empty input", () => {
    const d = calculateRankDistribution([]);
    expect(d.total).toBe(0);
    expect(d.graded).toBe(0);
    expect(d.bands).toHaveLength(5);
    expect(d.bands.every((b) => b.count === 0 && b.percentage === 0)).toBe(
      true,
    );
  });

  it("counts rows per band and computes percentages of graded rows", () => {
    // 9.7 xuat-sac, 8.5 gioi, 6.8 kha, 5.0 trung-binh, 4.2 yeu
    const d = calculateRankDistribution([
      row(9.7),
      row(8.5),
      row(6.8),
      row(5.0),
      row(4.2),
    ]);
    expect(d.graded).toBe(5);
    expect(d.total).toBe(5);
    const byBand = Object.fromEntries(d.bands.map((b) => [b.band, b]));
    expect(byBand["xuat-sac"].count).toBe(1);
    expect(byBand.gioi.count).toBe(1);
    expect(byBand.kha.count).toBe(1);
    expect(byBand["trung-binh"].count).toBe(1);
    expect(byBand.yeu.count).toBe(1);
    expect(byBand.gioi.percentage).toBe(20);
  });

  it("excludes null-average rows from graded denominator", () => {
    const d = calculateRankDistribution([row(8.5), row(null), row(null)]);
    expect(d.total).toBe(3);
    expect(d.graded).toBe(1);
    const gioi = d.bands.find((b) => b.band === "gioi");
    expect(gioi?.percentage).toBe(100);
  });
});
