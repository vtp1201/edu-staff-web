import { describe, expect, it } from "vitest";
import { urgentCardClass } from "./announcement-card";

/**
 * DR-009 US-E16.1 — side-stripe ban. The urgent-card emphasis must be a full
 * 1px border + bg tint, never a one-sided `border-l-*` accent stripe.
 */
describe("urgentCardClass", () => {
  it("urgent → full border + error tint, no left stripe", () => {
    const cls = urgentCardClass(true);
    expect(cls).toContain("border border-edu-error/30");
    expect(cls).toContain("bg-edu-error/10");
    expect(cls).not.toMatch(/border-l/);
  });

  it("non-urgent → no emphasis class", () => {
    expect(urgentCardClass(false)).toBe("");
  });
});
