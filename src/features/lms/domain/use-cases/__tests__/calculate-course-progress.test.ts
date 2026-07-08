import { describe, expect, it } from "vitest";
import { calculateCourseProgress } from "../calculate-course-progress";

describe("calculateCourseProgress", () => {
  it("returns not-started when zero lessons done", () => {
    expect(calculateCourseProgress(0, 10)).toEqual({
      done: 0,
      total: 10,
      pct: 0,
      status: "not-started",
    });
  });

  it("returns in-progress with rounded pct for partial completion", () => {
    // 18/24 = 75%
    expect(calculateCourseProgress(18, 24)).toEqual({
      done: 18,
      total: 24,
      pct: 75,
      status: "in-progress",
    });
  });

  it("rounds pct to the nearest integer", () => {
    // 1/3 = 33.33% -> 33
    expect(calculateCourseProgress(1, 3).pct).toBe(33);
    // 2/3 = 66.66% -> 67
    expect(calculateCourseProgress(2, 3).pct).toBe(67);
  });

  it("returns completed when all lessons done", () => {
    expect(calculateCourseProgress(24, 24)).toEqual({
      done: 24,
      total: 24,
      pct: 100,
      status: "completed",
    });
  });

  it("guards total === 0 (no lessons uploaded) as not-started, pct 0", () => {
    expect(calculateCourseProgress(0, 0)).toEqual({
      done: 0,
      total: 0,
      pct: 0,
      status: "not-started",
    });
  });

  it("never divides by zero even with a stray done count", () => {
    // Defensive: total 0 always yields not-started/0 regardless of done.
    const result = calculateCourseProgress(3, 0);
    expect(result.pct).toBe(0);
    expect(result.status).toBe("not-started");
  });
});
