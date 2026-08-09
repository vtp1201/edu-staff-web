import { describe, expect, it } from "vitest";
import { NOTIFICATION_BADGE_CLASS } from "./notification-badge";

/**
 * DR-009 US-E16.2 — error-ramp contrast. The bell unread badge must use the
 * AA-compliant dark error token, not the lighter `bg-edu-error` hue.
 */
describe("NOTIFICATION_BADGE_CLASS", () => {
  it("uses bg-edu-error-dark", () => {
    expect(NOTIFICATION_BADGE_CLASS).toContain("bg-edu-error-dark");
  });

  it("does NOT use the lighter bg-edu-error hue", () => {
    expect(NOTIFICATION_BADGE_CLASS).not.toMatch(/bg-edu-error(?!-dark)/);
  });
});
