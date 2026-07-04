import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.1 — Responsive Stat-Card Grid (teacher-dashboard-home).
 *
 * CSS-class lock (node-env Vitest, no render): the stat grid must use the
 * auto-fit minmax(200px) column class. Pre-fix this file already used auto-fit
 * but with a 180px floor — this raises the floor to 200px (spec.md §4 FR-1).
 * Column-count proof lives in the Storybook viewport stories.
 */

const STAT_GRID = "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]";
const src = readFileSync(
  new URL("./teacher-dashboard-home.tsx", import.meta.url),
  "utf8",
);

describe("teacher-dashboard-home stat-grid", () => {
  it("uses the auto-fit minmax(200px) stat-grid column class", () => {
    expect(src).toContain(STAT_GRID);
  });

  it("keeps the 16px gap-4 gap on the stat-grid container", () => {
    expect(src).toContain(`${STAT_GRID} gap-4`);
  });

  it("no longer uses the 180px floor", () => {
    expect(src).not.toContain("minmax(180px");
  });
});
