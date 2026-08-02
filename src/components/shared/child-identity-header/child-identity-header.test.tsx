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
  /**
   * Both tones use the AA-safe *text* tokens, not the brand fill tokens: the
   * initials are small bold text on a tint, so WCAG 1.4.3 wants ≥4.5:1 —
   * `text-primary` (#4570EA, 4.41:1) and `text-edu-purple` (#7B5EA7, 4.32:1)
   * both fail it. `--edu-primary-accessible` (#4468E0, 4.88:1) and
   * `--edu-purple-text` (#5B3D8A, 6.9:1) clear it on the same tints.
   */
  it("maps tones to token-only, AA-contrast avatar-fallback classes", () => {
    expect(identityToneClass("primary")).toBe(
      "bg-edu-primary-accessible/10 font-bold text-edu-primary-accessible",
    );
    expect(identityToneClass("purple")).toBe(
      "bg-edu-purple/15 font-semibold text-edu-purple-text",
    );
  });

  it("never emits the sub-4.5:1 fill tokens", () => {
    for (const tone of ["primary", "purple"] as const) {
      const cls = identityToneClass(tone);
      expect(cls).not.toMatch(/\btext-primary\b/);
      expect(cls).not.toMatch(/\btext-edu-purple(?!-text)\b/);
    }
  });
});
