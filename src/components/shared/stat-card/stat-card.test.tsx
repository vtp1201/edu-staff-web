import { describe, expect, it } from "vitest";
import { compactToneClass, trendColorClass } from "./stat-card";

/**
 * StatCard variant logic is unit-tested at the pure-helper level (node env),
 * matching this repo's test toolchain (no @testing-library/react installed;
 * DOM rendering is covered by Storybook interaction tests in browser mode).
 * Render-level coverage for default / compact / mini lives in
 * stat-card.stories.tsx (Primary, WithTrendUp, WithTrendDown, Compact,
 * CompactMuted, Mini).
 */
describe("StatCard trend chip color — WCAG 1.4.3 AA (decision 0027)", () => {
  // text-xs (≈12px) = small text → 4.5:1 required. Raw status hues fail:
  // #13DEB9 (1.74:1) / #FA896B (2.36:1). AA-compliant replacements:
  // text-edu-success-text (#007A6E = 5.4:1), text-edu-error-text (#C0392B = 5.1:1).
  it("up direction uses text-edu-success-text (5.4:1 on white, passes AA)", () => {
    expect(trendColorClass("up")).toBe("text-edu-success-text");
  });

  it("down direction uses text-edu-error-text (5.1:1 on white, passes AA)", () => {
    expect(trendColorClass("down")).toBe("text-edu-error-text");
  });
});

describe("StatCard compact tone mapping", () => {
  // Decision 0027: use accessible dark text tokens (5.4:1 / 5.1:1) instead of
  // vibrant hue tokens (#13DEB9 / #FA896B) which fail AA on white backgrounds.
  it("maps tone='success' to text-edu-success-text (AA-compliant, decision 0027)", () => {
    expect(compactToneClass("success")).toBe("text-edu-success-text");
  });

  it("maps tone='error' to text-edu-error-text (AA-compliant, decision 0027)", () => {
    expect(compactToneClass("error")).toBe("text-edu-error-text");
  });

  it("maps tone='primary' to text-primary", () => {
    expect(compactToneClass("primary")).toBe("text-primary");
  });

  it("maps tone='muted' to text-foreground", () => {
    expect(compactToneClass("muted")).toBe("text-foreground");
  });

  it("falls back to text-foreground for unmapped/default tone", () => {
    expect(compactToneClass(undefined)).toBe("text-foreground");
    // tones that exist on StatTone but have no compact mapping fall back too
    expect(compactToneClass("warning")).toBe("text-foreground");
  });
});
