import { describe, expect, it } from "vitest";
import { scheduleRowClass } from "./teacher-dashboard-home";

/**
 * DR-009 US-E16.1 — side-stripe ban. A live schedule row gets full horizontal
 * borders + success tint; non-live rows get nothing. No `border-l-*` stripe.
 */
describe("scheduleRowClass", () => {
  it("live → success tint + horizontal borders, no left stripe", () => {
    const cls = scheduleRowClass("live");
    expect(cls).toContain("bg-edu-success/14");
    expect(cls).toContain("border-y border-edu-success/30");
    expect(cls).not.toMatch(/border-l/);
  });

  it("done / upcoming → no emphasis class", () => {
    expect(scheduleRowClass("done")).toBe("");
    expect(scheduleRowClass("upcoming")).toBe("");
  });
});
