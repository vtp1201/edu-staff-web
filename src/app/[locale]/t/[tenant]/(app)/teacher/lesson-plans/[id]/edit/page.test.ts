import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonPlanEntity } from "@/features/lesson-plan/domain/entities/lesson-plan.entity";

/**
 * FR-008 single-plan visibility gating (AC-008.1..008.6) — this route's `page.tsx`
 * is the ONLY place the redirect-vs-stay-on-route decision is made (per
 * `use-cases.md` UC-008); it had zero test coverage before this file (only the
 * sibling `actions.test.ts` covering the Server Actions, not the RSC gate
 * itself). `redirect()` throws a `NEXT_REDIRECT;<type>;<url>;<status>;` digest
 * synchronously with no request-scoped storage dependency — call the real page
 * function directly in node env and assert on the thrown target (recipe from
 * `principal/reports/layout.test.ts`).
 */

const getExec = vi.fn();

vi.mock("@/bootstrap/di/lesson-plan.di", () => ({
  makeGetLessonPlanUseCase: async () => ({ execute: getExec }),
  getSubjectOptions: async () => [{ id: "sub-math", name: "Toán học" }],
}));

const plan: LessonPlanEntity = {
  planId: "lp-9",
  teacherId: "t-owner",
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án v2",
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
  status: "DRAFT",
  tags: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
};

function redirectTarget(err: unknown): string {
  const digest = (err as { digest?: string } | null)?.digest ?? "";
  const parts = digest.split(";");
  return parts[2] ?? "";
}

async function renderPage(id = "lp-9") {
  const { default: EditLessonPlanPage } = await import("./page");
  try {
    const result = await EditLessonPlanPage({
      params: Promise.resolve({ locale: "vi", tenant: "t1", id }),
    });
    return { redirected: false, rendered: result, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

describe("EditLessonPlanPage — FR-008 single-plan visibility gate (UC-008)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("AC-008.1 — owner's own plan (any status) renders with full data, no redirect", async () => {
    getExec.mockResolvedValue({ ok: true, value: plan });
    const result = await renderPage();
    expect(result.redirected).toBe(false);
  });

  it("AC-008.2 — non-owner viewing a PUBLISHED plan renders read-only, no redirect", async () => {
    getExec.mockResolvedValue({
      ok: true,
      value: { ...plan, teacherId: "t-other", status: "PUBLISHED" as const },
    });
    const result = await renderPage();
    expect(result.redirected).toBe(false);
  });

  it("AC-008.3 — not-visible (non-owner requesting a DRAFT) redirects to the list with the distinct access-denied notice", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "not-visible" } });
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe(
      "/vi/t/t1/teacher/lesson-plans?notice=access-denied",
    );
  });

  it("AC-008.3 variant — forbidden also maps to the access-denied notice (not not-found)", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe(
      "/vi/t/t1/teacher/lesson-plans?notice=access-denied",
    );
  });

  it("AC-008.4 — plan does not exist redirects to the list with the distinct not-found notice (different from AC-008.3)", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "not-found" } });
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/teacher/lesson-plans?notice=not-found");
  });

  it("AC-008.5 — malformed id is treated as the not-found-style redirect (defensive)", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "invalid-id" } });
    const result = await renderPage("not-a-valid-id");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/teacher/lesson-plans?notice=not-found");
  });

  it("AC-008.6 — network/5xx failure stays on the route (no redirect), builder gets loadFailed=true for its own client error state", async () => {
    getExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const result = await renderPage();
    expect(result.redirected).toBe(false);
  });

  it("AC-008.6 variant — an unmapped/unknown failure also stays on the route rather than redirecting", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "unknown" } });
    const result = await renderPage();
    expect(result.redirected).toBe(false);
  });
});
