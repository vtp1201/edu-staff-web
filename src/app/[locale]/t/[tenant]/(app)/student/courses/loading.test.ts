import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/student/courses` route-segment loading skeleton (US-E24.1 a11y fix round,
 * A11Y-001). The page is a pure async RSC, so the skeleton can only be
 * delivered through the `loading.tsx` Suspense convention — and the skeleton
 * grid is `aria-hidden`, so it MUST be paired with an sr-only live region or
 * the wait is silent to screen readers.
 *
 * Source-text lock (node env — the RSC awaits `getTranslations`).
 */
const src = readFileSync(new URL("./loading.tsx", import.meta.url), "utf8");

describe("student/courses loading.tsx", () => {
  it("renders the shared CoursesSkeleton (no second copy of the grid)", () => {
    expect(src).toContain("CoursesSkeleton");
  });

  it("announces the wait through an sr-only role=status", () => {
    expect(src).toContain('role="status"');
    expect(src).toContain('className="sr-only"');
  });

  it("sources the announcement from i18n, never a hardcoded string", () => {
    expect(src).toContain("getTranslations");
    expect(src).toContain('t("skeleton.loading")');
  });
});
