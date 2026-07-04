import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.1 — Responsive Stat-Card Grid (student-dashboard).
 *
 * CSS-class lock (node-env Vitest, no render). Column-count proof lives in the
 * Storybook viewport stories.
 */

const STAT_GRID = "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]";
const OLD_STAT_CONTAINER = "grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";
const FORBIDDEN = ["sm:grid-cols-2", "xl:grid-cols-4"];
const src = readFileSync(
  new URL("./student-dashboard.tsx", import.meta.url),
  "utf8",
);

describe("student-dashboard stat-grid", () => {
  it("uses the auto-fit minmax(200px) stat-grid column class", () => {
    expect(src).toContain(STAT_GRID);
  });

  it("keeps the 16px gap-4 gap on the stat-grid container", () => {
    expect(src).toContain(`${STAT_GRID} gap-4`);
  });

  it("no longer uses the pre-fix hard-coded stat-grid container class", () => {
    expect(src).not.toContain(OLD_STAT_CONTAINER);
  });

  it.each(FORBIDDEN)("no longer contains the hard-coded class %s", (cls) => {
    expect(src).not.toContain(cls);
  });
});
