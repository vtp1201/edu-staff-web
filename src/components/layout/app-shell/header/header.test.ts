import { describe, expect, it } from "vitest";
import { NOTIFICATION_DOT_CLASS } from "./header";

/**
 * DR-009 US-E16.2 — error-ramp contrast. The bell notification dot must use the
 * AA-compliant dark error token, not the lighter `bg-edu-error` hue.
 */
describe("NOTIFICATION_DOT_CLASS", () => {
  it("uses bg-edu-error-dark", () => {
    expect(NOTIFICATION_DOT_CLASS).toContain("bg-edu-error-dark");
  });

  it("does NOT use the lighter bg-edu-error hue", () => {
    expect(NOTIFICATION_DOT_CLASS).not.toMatch(/bg-edu-error(?!-dark)/);
  });
});
