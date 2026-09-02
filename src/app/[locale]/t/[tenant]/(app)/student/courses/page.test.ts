import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * QA gap-fill (US-E24.1) — `/student/courses` RSC wiring, end to end.
 *
 * The packet's AC 6 ("`/student/courses` vẫn render — không crash") was
 * evidenced only by `bun build` succeeding in both `USE_MOCK` modes. That is
 * NOT proof: `requireRole` reads `next/headers` cookies, so the route is
 * force-dynamic and Next never executes the RSC function body during a static
 * build. This test actually calls `StudentCoursesPage()` and reads the
 * returned element's props for every branch: forbidden guard, unresolvable
 * class (`no-class`), a repository failure, and the success path with a real
 * `CourseSummary[]` shape mapped through to `CourseCardVm[]`.
 */

const requireRole = vi.fn();
const resolveMyLmsClassId = vi.fn();
const listExec = vi.fn();
const makeListCoursesUseCase = vi.fn(async () => ({ execute: listExec }));

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/lms.di", () => ({
  makeListCoursesUseCase: () => makeListCoursesUseCase(),
  resolveMyLmsClassId: () => resolveMyLmsClassId(),
}));

async function renderPage() {
  const { default: Page } = await import("./page");
  return Page({
    params: Promise.resolve({ locale: "vi", tenant: "t1" }),
  }) as unknown as Promise<{
    props: {
      courses: unknown[];
      errorKey: string | null;
    };
  }>;
}

beforeEach(() => vi.clearAllMocks());

describe("StudentCoursesPage — RSC wiring (US-E24.1)", () => {
  it("rejects a non-student with a forbidden VM, never calling the DI/class resolver", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "wrong-role" });
    const el = await renderPage();
    expect(el.props.courses).toEqual([]);
    expect(el.props.errorKey).toBe("forbidden");
    expect(resolveMyLmsClassId).not.toHaveBeenCalled();
    expect(makeListCoursesUseCase).not.toHaveBeenCalled();
  });

  it("seeds `no-class` (never a silent empty list) when the class cannot be resolved", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue(null);
    const el = await renderPage();
    expect(el.props.courses).toEqual([]);
    expect(el.props.errorKey).toBe("no-class");
    expect(makeListCoursesUseCase).not.toHaveBeenCalled();
  });

  it("propagates a repository failure key verbatim (no crash, no invented copy)", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    const el = await renderPage();
    expect(el.props.courses).toEqual([]);
    expect(el.props.errorKey).toBe("forbidden");
  });

  it("maps a real CourseSummary[] end to end without throwing", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "c1",
          classId: "cl1",
          subjectId: "s1",
          title: "Toán 10",
          status: "PUBLISHED",
          isDefault: true,
          createdBy: "t1",
          updatedAt: "2026-08-02T00:00:00Z",
          publishedAt: "2026-08-02T00:00:00Z",
        },
        {
          id: "c2",
          classId: "cl1",
          subjectId: "s2",
          title: "Văn 10",
          status: "DRAFT",
          isDefault: false,
          createdBy: "t1",
          updatedAt: "2026-08-02T00:00:00Z",
          publishedAt: null,
        },
      ],
    });

    const el = await renderPage();
    expect(el.props.errorKey).toBeNull();
    expect(el.props.courses).toHaveLength(2);
    expect(el.props.courses[0]).toMatchObject({
      id: "c1",
      title: "Toán 10",
      status: "PUBLISHED",
      isDefault: true,
      href: "/vi/t/t1/student/courses/c1",
    });
    expect(el.props.courses[1]).toMatchObject({
      id: "c2",
      status: "DRAFT",
      isDefault: false,
    });
  });
});
