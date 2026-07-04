import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.1 — Responsive Stat-Card Grid.
 *
 * Pure CSS-class lock (no runtime render): this repo's Vitest runs in node env
 * and these are next-intl client screens, so the responsive-grid contract is
 * proven by asserting the stat-grid container class on the source, per spec.md
 * §Validation ("assert class present ... assert no grid-cols-4 remains").
 * The 375/768/1280px column-count proof lives in the Storybook viewport stories.
 */

const STAT_GRID = "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]";
// The exact pre-fix stat-grid container class (unique to the stat grid in
// these three files — other grids here use sm:grid-cols-3 / sm:grid-cols-2
// form layouts that this story MUST NOT touch).
const OLD_STAT_CONTAINER = "grid-cols-2 gap-3.5 lg:grid-cols-4";
// Hard-coded 4-col classes that must not survive anywhere in these files.
const FORBIDDEN = ["lg:grid-cols-4", "xl:grid-cols-4", "sm:grid-cols-4"];

function read(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

describe.each([
  ["discipline-screen.tsx", "./discipline-screen.tsx"],
  ["conduct-tab.tsx", "./components/conduct-tab.tsx"],
  ["violations-tab.tsx", "./components/violations-tab.tsx"],
])("discipline stat-grid — %s", (_name, rel) => {
  const src = read(rel);

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
