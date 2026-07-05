import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.10 — Feature-local TableRowSkeleton (discipline).
 *
 * Source-text lock (node env, no @testing-library/react) — mirrors
 * responsive-stat-grid.test.ts. Row shape + tokens-only proof.
 */

function read(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

const src = read("./table-row-skeleton.tsx");

describe("TableRowSkeleton — row shape (FR-004)", () => {
  it("enforces the 44px min-height touch/row target", () => {
    expect(src).toContain("min-h-[44px]");
  });

  it("uses a bottom border with the border token", () => {
    expect(src).toContain("border-b border-border");
  });

  it("renders varying-width cell blocks", () => {
    expect(src).toContain("w-24");
    expect(src).toContain("w-16");
    expect(src).toContain("w-32");
  });

  it("uses no raw colors (tokens-only via the shared Skeleton)", () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(src).not.toMatch(/(bg|text|border)-(gray|slate|zinc|neutral)-\d/);
  });

  it("does not re-add animate-pulse (base Skeleton owns it)", () => {
    expect(src).not.toContain("animate-pulse");
  });
});
