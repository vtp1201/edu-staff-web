import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * US-E17.10 — Teacher dashboard route-segment loading skeleton (FR-002).
 *
 * TeacherDashboard is a pure async RSC with no client `isLoading` flag, so the
 * skeleton is delivered via the Next.js App Router `loading.tsx` Suspense
 * convention. Source-text lock (node env) confirms the shared grid is used
 * with the real 6-card count.
 */

function read(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

const src = read("./loading.tsx");

describe("teacher loading.tsx (FR-002)", () => {
  it("uses the shared StatCardSkeletonGrid", () => {
    expect(src).toContain("StatCardSkeletonGrid");
  });

  it("renders 6 skeletons matching the real stat grid", () => {
    expect(src).toContain("count={6}");
  });

  it("sources the sr label from Common.skeleton via getTranslations", () => {
    expect(src).toContain("getTranslations");
    expect(src).toContain("skeleton.loadingAriaLabel");
  });
});
