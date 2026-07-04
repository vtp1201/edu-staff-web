import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.1 — Responsive Stat-Card Grid (attendance-summary-card).
 *
 * CSS-class lock (node-env Vitest, no render). The pre-fix container used a
 * 14px-ish gap-3; AC-14 requires the 16px gap-4, so the gap is normalised here.
 * Column-count proof lives in the Storybook viewport stories.
 */

const STAT_GRID = "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]";
const OLD_STAT_CONTAINER = "grid-cols-2 gap-3 sm:grid-cols-4";
const FORBIDDEN = ["grid-cols-2", "sm:grid-cols-4"];
const src = readFileSync(
  new URL("./attendance-summary-card.tsx", import.meta.url),
  "utf8",
);

describe("attendance-summary-card stat-grid", () => {
  it("uses the auto-fit minmax(200px) stat-grid column class", () => {
    expect(src).toContain(STAT_GRID);
  });

  it("uses the 16px gap-4 gap (normalised from gap-3, AC-14)", () => {
    expect(src).toContain(`${STAT_GRID} gap-4`);
  });

  it("no longer uses the pre-fix hard-coded stat-grid container class", () => {
    expect(src).not.toContain(OLD_STAT_CONTAINER);
  });

  it.each(FORBIDDEN)("no longer contains the hard-coded class %s", (cls) => {
    expect(src).not.toContain(cls);
  });
});
