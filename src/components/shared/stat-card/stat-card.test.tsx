import { describe, expect, it } from "vitest";
import {
  compactToneClass,
  STAT_DENSE_MOBILE,
  STAT_TONE,
  trendColorClass,
} from "./stat-card";

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

describe("StatCard default-variant icon tone — WCAG 1.4.11 (A11Y-002)", () => {
  // The icon sits on its OWN tone tint (`bg-<hue>/15` over the white card), so
  // colouring it with the raw hue is self-on-self: #FFAE1F on #FFF3DD = 1.69:1,
  // #13DEB9 on #DCFAF4 = 1.56:1 — both below the 3:1 floor for graphical
  // objects. Existing darker sibling tokens fix it without a new token.
  it("warning icon uses text-edu-warning-foreground (#2A3547 = 11.25:1 on the tint)", () => {
    expect(STAT_TONE.warning.icon).toBe("text-edu-warning-foreground");
  });

  it("success icon uses text-edu-success-text (#007A6E = 4.75:1 on the tint)", () => {
    expect(STAT_TONE.success.icon).toBe("text-edu-success-text");
  });

  it("never colours warning/success icons with their own raw hue", () => {
    expect(STAT_TONE.warning.icon).not.toBe("text-edu-warning");
    expect(STAT_TONE.success.icon).not.toBe("text-edu-success");
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

/**
 * `denseOnMobile` exists because the 2-up stat grid at 375px gives each card
 * ~152px while the default card needs ~173px of min-content — the row overflows
 * and the page scrolls sideways (a11y A11Y-101, caught by the
 * AttendanceSummaryBlock Mobile story, which is where the no-overflow proof
 * lives). The invariant asserted here is the OTHER half: it must not change any
 * existing screen, i.e. every dense value restores the design-spec default from
 * `sm` up.
 */
describe("StatCard denseOnMobile — mobile-only, spec-restoring at sm", () => {
  it("restores the design-spec padding/gap from sm", () => {
    expect(STAT_DENSE_MOBILE.root).toContain("sm:gap-4");
    expect(STAT_DENSE_MOBILE.root).toContain("sm:px-6");
    expect(STAT_DENSE_MOBILE.root).toContain("sm:py-5");
  });

  it("wraps the label below sm instead of ellipsizing it, truncating again from sm", () => {
    expect(STAT_DENSE_MOBILE.label).toBe("line-clamp-2 sm:truncate");
  });

  it("restores the 52px icon box and 26px stat value from sm", () => {
    expect(STAT_DENSE_MOBILE.box).toContain("sm:size-13");
    expect(STAT_DENSE_MOBILE.icon).toContain("sm:size-6");
    expect(STAT_DENSE_MOBILE.value).toContain("sm:text-[26px]");
  });

  it("is strictly smaller below sm than the default it replaces", () => {
    expect(STAT_DENSE_MOBILE.box.startsWith("size-11 ")).toBe(true);
    expect(STAT_DENSE_MOBILE.icon.startsWith("size-5 ")).toBe(true);
    expect(STAT_DENSE_MOBILE.value.startsWith("text-[22px] ")).toBe(true);
  });
});
