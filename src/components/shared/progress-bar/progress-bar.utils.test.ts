import { describe, expect, it } from "vitest";
import { clampPercent } from "./progress-bar.utils";

/**
 * `clampPercent` is the whole reason the bar can never render `NaN`/`Infinity`
 * width or an out-of-range `aria-valuenow` (US-E24.6). Node-env unit test —
 * the rendered markup is proven in `progress-bar.stories.tsx`.
 */
describe("clampPercent", () => {
  it("maps value/max onto 0–100", () => {
    expect(clampPercent(45, 100)).toBe(45);
    expect(clampPercent(1, 2)).toBe(50);
  });

  it("rounds to a whole percent (no 33.3333% width strings)", () => {
    expect(clampPercent(1, 3)).toBe(33);
    expect(clampPercent(2, 3)).toBe(67);
  });

  it("clamps a negative value to 0 instead of a negative width", () => {
    expect(clampPercent(-5, 100)).toBe(0);
  });

  it("clamps a value above max to 100", () => {
    expect(clampPercent(150, 100)).toBe(100);
  });

  it("returns 0 — never NaN/Infinity — when max is 0 (empty month)", () => {
    expect(clampPercent(0, 0)).toBe(0);
    expect(clampPercent(5, 0)).toBe(0);
  });

  it("returns 0 for a negative or non-finite max rather than propagating it", () => {
    expect(clampPercent(5, -10)).toBe(0);
    expect(clampPercent(5, Number.NaN)).toBe(0);
    expect(clampPercent(Number.NaN, 100)).toBe(0);
  });

  it("defaults max to 100 so a caller can pass a percent directly", () => {
    expect(clampPercent(72)).toBe(72);
  });
});
