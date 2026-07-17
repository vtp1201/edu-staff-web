import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * QA (US-E18.15) — item #6 (mobile/responsive sanity check). The exam-bank
 * card grid must default to a single column below `sm` (no fixed/min-width
 * that could overflow a 320px viewport) and never regress to a cramped
 * multi-column default, matching the sibling-epic pattern established in
 * `src/features/exam/presentation/exam-result/responsive-stat-grid.test.ts`
 * (US-E17.1, OQ-003). Cards themselves have no fixed width (`flex flex-col`),
 * so a single-column grid is inherently 320px-safe.
 */
const src = readFileSync(
  new URL("./exam-bank-screen.tsx", import.meta.url),
  "utf8",
);

describe("exam-bank-screen card grid (mobile safety, US-E18.15)", () => {
  it("defaults to a single column below `sm` (320px-safe)", () => {
    expect(src).toContain(
      "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
    );
  });

  it("does not use a fixed/cramped default column count (regression guard)", () => {
    expect(src).not.toContain("grid grid-cols-2");
    expect(src).not.toContain("grid grid-cols-3");
    expect(src).not.toContain("grid grid-cols-4");
  });
});
