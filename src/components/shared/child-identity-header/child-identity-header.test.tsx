import { describe, expect, it } from "vitest";
import { childInitials, identityToneClass } from "./child-identity-header";

/**
 * Pure-helper coverage (node env — no @testing-library/react in this repo;
 * render-level proof lives in child-identity-header.stories.tsx).
 *
 * Both `initials` modes exist because the two pre-existing inline instances
 * this component consolidates rendered different initials, and promoting must
 * not silently change either screen's visuals (component-organization.md,
 * decision 0026 — "promote, đừng copy").
 */
describe("childInitials", () => {
  it("double mode uses the last two name parts (consent-card behaviour)", () => {
    expect(childInitials("Nguyễn Minh Khoa", "double")).toBe("MK");
  });

  it("single mode uses only the last name part (parent-dashboard behaviour)", () => {
    expect(childInitials("Nguyễn Minh An", "single")).toBe("A");
  });

  it("handles a one-word name in both modes", () => {
    expect(childInitials("Khoa", "double")).toBe("K");
    expect(childInitials("Khoa", "single")).toBe("K");
  });

  it("ignores extra whitespace instead of emitting blank initials", () => {
    expect(childInitials("  Trần   Bảo  Ngọc ", "double")).toBe("BN");
  });

  it("returns an empty string for an empty name (never crashes)", () => {
    expect(childInitials("   ", "double")).toBe("");
  });
});

describe("identityToneClass", () => {
  it("maps tones to token-only avatar-fallback classes", () => {
    expect(identityToneClass("primary")).toBe(
      "bg-primary/10 font-bold text-primary",
    );
    expect(identityToneClass("purple")).toBe(
      "bg-edu-purple/15 font-semibold text-edu-purple",
    );
  });
});
