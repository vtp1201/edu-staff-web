import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.10 — Shared StatCardSkeleton.
 *
 * Source-text lock (no runtime render): this repo's Vitest runs in node env
 * with no @testing-library/react, so presentational shape is proven by
 * asserting the exact Tailwind classes on the source (same pattern as
 * stat-card.test.tsx and responsive-stat-grid.test.ts). The visual
 * skeleton→data transition + a11y live in the Storybook interaction stories.
 */

function read(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

const src = read("./stat-card-skeleton.tsx");

describe("StatCardSkeleton — shape matches DefaultStatCard (FR-001)", () => {
  it("uses the 52px icon box size (size-13)", () => {
    expect(src).toContain("size-13");
  });

  it("uses the card radius token for the box + icon", () => {
    expect(src).toContain("rounded-[var(--edu-radius-card)]");
  });

  it("has the value block (h-7 w-16) mirroring the 26px value", () => {
    expect(src).toContain("h-7 w-16");
  });

  it("has the label block (h-3 w-20) mirroring the label line", () => {
    expect(src).toContain("h-3 w-20");
  });

  it("reuses the card shell classes (border, bg-card, shadow-card, px-6 py-5)", () => {
    expect(src).toContain("border border-border");
    expect(src).toContain("bg-card");
    expect(src).toContain("shadow-card");
    expect(src).toContain("px-6 py-5");
  });
});

describe("StatCardSkeletonGrid — a11y wrapper + shared grid (FR-005, FR-007)", () => {
  it("wraps skeletons in role=status", () => {
    expect(src).toContain('role: "status"');
  });

  it("sets aria-busy=true on the wrapper", () => {
    expect(src).toContain('"aria-busy": "true"');
  });

  it("renders a visually-hidden sr-only label", () => {
    expect(src).toContain("sr-only");
  });

  it("uses the shared dashboard stat-grid column class", () => {
    expect(src).toContain(
      "grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4",
    );
  });

  it("does not re-add animate-pulse (the base Skeleton primitive owns it)", () => {
    expect(src).not.toContain("animate-pulse");
  });
});

describe("StatCardSkeletonGrid — announce prop gates the live region (A11Y-001)", () => {
  it("exposes an announce prop defaulting to true", () => {
    expect(src).toContain("announce = true");
    expect(src).toContain("announce?: boolean");
  });

  it("gates role=status/aria-busy behind announce", () => {
    // The status/aria-busy attrs are spread conditionally on `announce`.
    expect(src).toContain(
      'announce ? { role: "status", "aria-busy": "true" } : {}',
    );
  });

  it("gates the sr-only live-region label behind announce", () => {
    expect(src).toContain('announce && <span className="sr-only">');
  });
});
