import { describe, expect, it } from "vitest";
import { fillTransform } from "./grade-distribution-chart";

/**
 * DR-009 US-E16.4 — the distribution fill animates a GPU-composited `scaleX`
 * transform, not `width`. The ratio is clamped to [0, 1].
 */
describe("fillTransform", () => {
  it("maps a ratio to scaleX", () => {
    expect(fillTransform(0.5)).toBe("scaleX(0.5)");
    expect(fillTransform(0)).toBe("scaleX(0)");
    expect(fillTransform(1)).toBe("scaleX(1)");
  });

  it("clamps out-of-range ratios", () => {
    expect(fillTransform(1.4)).toBe("scaleX(1)");
    expect(fillTransform(-0.3)).toBe("scaleX(0)");
  });

  it("never emits a width percentage", () => {
    expect(fillTransform(0.5)).not.toMatch(/%/);
  });
});
