import { describe, expect, it } from "vitest";
import { conductColorVar } from "./conduct-color";

/**
 * Domain rule TR-017 (US-E09.4): conduct score → CSS variable.
 * score >= 90  → var(--edu-success)
 * score >= 70  → var(--edu-primary)
 * score >= 50  → var(--edu-warning)
 * score <  50  → var(--edu-error)
 * floor = 0 (caller responsibility; this fn is pure/monotone below 0)
 */
describe("conductColorVar", () => {
  it("score 100 → success", () => {
    expect(conductColorVar(100)).toBe("var(--edu-success)");
  });

  it("score 90 (exact boundary) → success", () => {
    expect(conductColorVar(90)).toBe("var(--edu-success)");
  });

  it("score 89 (just below 90) → primary", () => {
    expect(conductColorVar(89)).toBe("var(--edu-primary)");
  });

  it("score 70 (exact boundary) → primary", () => {
    expect(conductColorVar(70)).toBe("var(--edu-primary)");
  });

  it("score 69 (just below 70) → warning", () => {
    expect(conductColorVar(69)).toBe("var(--edu-warning)");
  });

  it("score 50 (exact boundary) → warning", () => {
    expect(conductColorVar(50)).toBe("var(--edu-warning)");
  });

  it("score 49 (just below 50) → error", () => {
    expect(conductColorVar(49)).toBe("var(--edu-error)");
  });

  it("score 0 (floor) → error", () => {
    expect(conductColorVar(0)).toBe("var(--edu-error)");
  });

  it("score 82 (c1 mock — Khá/good) → primary", () => {
    expect(conductColorVar(82)).toBe("var(--edu-primary)");
  });

  it("score 94 (c2 mock — Tốt/excellent) → success", () => {
    expect(conductColorVar(94)).toBe("var(--edu-success)");
  });
});
