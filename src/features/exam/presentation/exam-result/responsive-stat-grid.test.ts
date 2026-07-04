import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.1 — Responsive Stat-Card Grid (exam-result, OQ-003 sweep).
 *
 * exam-result has two StatCard grids. The 4-col MCQ-stats grid matched the
 * story's target pattern (`grid gap-4 sm:grid-cols-4` — cramped 4-up on tablet)
 * and is migrated to auto-fit. The 3-col grid (`sm:grid-cols-3`) is NOT in the
 * OQ-003 pattern list and is already mobile-safe (1 col below sm), so it is
 * left untouched — locked here as a regression guard.
 */

const STAT_GRID = "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]";
const src = readFileSync(new URL("./exam-result.tsx", import.meta.url), "utf8");

describe("exam-result stat-grid (OQ-003)", () => {
  it("migrates the 4-col MCQ-stats grid to auto-fit minmax(200px)", () => {
    expect(src).toContain(`${STAT_GRID} gap-4`);
  });

  it("no longer uses the cramped sm:grid-cols-4 stat grid", () => {
    expect(src).not.toContain("sm:grid-cols-4");
  });

  it("leaves the already-responsive 3-col grid untouched", () => {
    expect(src).toContain("grid gap-4 sm:grid-cols-3");
  });
});
