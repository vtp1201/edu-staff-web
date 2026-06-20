import { describe, expect, it } from "vitest";
import { parentRowClass } from "./subjects-screen";

/**
 * DR-009 US-E16.1 — side-stripe ban. Active parent row uses a solid bg tint;
 * inactive uses only a hover bg. Neither carries a `border-l-*` accent stripe.
 */
describe("parentRowClass", () => {
  it("active → solid primary tint + bold, no left stripe", () => {
    const cls = parentRowClass(true);
    expect(cls).toContain("bg-primary/14");
    expect(cls).toContain("font-bold");
    expect(cls).not.toMatch(/border-l/);
  });

  it("inactive → hover bg only, no left stripe", () => {
    const cls = parentRowClass(false);
    expect(cls).toContain("hover:bg-muted");
    expect(cls).not.toMatch(/border-l/);
  });
});
