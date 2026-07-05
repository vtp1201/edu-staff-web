import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.10 — Student dashboard route-segment loading skeleton (FR-003).
 *
 * StudentDashboard is a pure async RSC (no client `isLoading`), so the skeleton
 * is delivered via the Next.js `loading.tsx` Suspense convention. Source-text
 * lock (node env) confirms the shared grid + real 4-card count.
 */

function read(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

const src = read("./loading.tsx");

describe("student loading.tsx (FR-003)", () => {
  it("uses the shared StatCardSkeletonGrid", () => {
    expect(src).toContain("StatCardSkeletonGrid");
  });

  it("renders 4 skeletons matching the real stat grid", () => {
    expect(src).toContain("count={4}");
  });

  it("sources the sr label from Common.skeleton via getTranslations", () => {
    expect(src).toContain("getTranslations");
    expect(src).toContain("skeleton.loadingAriaLabel");
  });
});
