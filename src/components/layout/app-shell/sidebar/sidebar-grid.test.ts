import { describe, expect, it } from "vitest";
import { sidebarGridStyle } from "./sidebar-grid";

/**
 * DR-009 US-E16.4 — sidebar collapse animates `grid-template-columns` (GPU
 * composited) not `width`. The single grid track width is token-driven via the
 * sidebar CSS vars (260px expanded / 72px collapsed).
 */
describe("sidebarGridStyle", () => {
  it("uses a grid display with a single column track", () => {
    expect(sidebarGridStyle(false).display).toBe("grid");
    expect(sidebarGridStyle(true).display).toBe("grid");
  });

  it("expanded → full-width sidebar var (260px)", () => {
    expect(sidebarGridStyle(false).gridTemplateColumns).toBe(
      "var(--edu-sidebar-width, 260px)",
    );
  });

  it("collapsed → collapsed sidebar var (72px)", () => {
    expect(sidebarGridStyle(true).gridTemplateColumns).toBe(
      "var(--edu-sidebar-width-collapsed, 72px)",
    );
  });
});
