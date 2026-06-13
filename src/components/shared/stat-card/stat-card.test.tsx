import { describe, expect, it } from "vitest";
import { compactToneClass } from "./stat-card";

/**
 * StatCard variant logic is unit-tested at the pure-helper level (node env),
 * matching this repo's test toolchain (no @testing-library/react installed;
 * DOM rendering is covered by Storybook interaction tests in browser mode).
 * Render-level coverage for default / compact / mini lives in
 * stat-card.stories.tsx (Primary, WithTrendUp, WithTrendDown, Compact,
 * CompactMuted, Mini).
 */
describe("StatCard compact tone mapping", () => {
  it("maps tone='success' to text-edu-success", () => {
    expect(compactToneClass("success")).toBe("text-edu-success");
  });

  it("maps tone='error' to text-edu-error", () => {
    expect(compactToneClass("error")).toBe("text-edu-error");
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
