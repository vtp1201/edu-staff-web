import { describe, expect, it } from "vitest";
import { statusToneClass } from "./status-badge";

/**
 * StatusBadge tone→class mapping is unit-tested at the pure-helper level
 * (node env), matching this repo's test toolchain (no @testing-library/react;
 * DOM rendering is covered by Storybook interaction tests in browser mode).
 * Render-level coverage for every tone lives in status-badge.stories.tsx.
 *
 * Decision 0027: value/text uses accessible dark text tokens
 * (text-edu-success-text / text-edu-error-text) instead of the vibrant hue
 * tokens which fail AA on light tinted backgrounds.
 */
describe("StatusBadge tone mapping", () => {
  it("defaults to primary (bg-primary/15 text-primary)", () => {
    expect(statusToneClass()).toBe("bg-primary/15 text-primary");
    expect(statusToneClass("primary")).toBe("bg-primary/15 text-primary");
  });

  it("maps tone='success' to AA text token (decision 0027)", () => {
    expect(statusToneClass("success")).toBe(
      "bg-edu-success/15 text-edu-success-text",
    );
  });

  it("maps tone='warning' to edu-warning-foreground (a11y, never white)", () => {
    expect(statusToneClass("warning")).toBe(
      "bg-edu-warning/15 text-edu-warning-foreground",
    );
  });

  it("maps tone='error' to AA text token (decision 0027)", () => {
    expect(statusToneClass("error")).toBe(
      "bg-edu-error/15 text-edu-error-text",
    );
  });

  // info/teal/purple vibrant hues fail AA on their own tinted bg (A11Y-001/002).
  // text-edu-text-primary (#2A3547) = 11.5:1 — guaranteed AA pass.
  it("maps tone='info' to text-edu-text-primary (AA fix, A11Y-001)", () => {
    expect(statusToneClass("info")).toBe(
      "bg-edu-info/15 text-edu-text-primary",
    );
  });

  it("maps tone='purple' to text-edu-text-primary (AA fix, A11Y-002)", () => {
    expect(statusToneClass("purple")).toBe(
      "bg-edu-purple/15 text-edu-text-primary",
    );
  });

  it("maps tone='teal' to text-edu-text-primary (AA fix, A11Y-001)", () => {
    expect(statusToneClass("teal")).toBe(
      "bg-edu-teal/15 text-edu-text-primary",
    );
  });

  // muted: text-muted-foreground (#8898A9) = 2.76:1 on bg — fails AA (A11Y-004).
  // text-foreground (#2A3547) = 11.5:1.
  it("maps tone='muted' to bg-muted text-foreground (AA fix, A11Y-004)", () => {
    expect(statusToneClass("muted")).toBe("bg-muted text-foreground");
  });
});
