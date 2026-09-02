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
const makeListCoursesWithSummaryUseCase = vi.fn(async () => ({
  execute: listExec,
}));

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/lms.di", () => ({
  makeListCoursesWithSummaryUseCase: () => makeListCoursesWithSummaryUseCase(),
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
    expect(makeListCoursesWithSummaryUseCase).not.toHaveBeenCalled();
  });

  it("seeds `no-class` (never a silent empty list) when the class cannot be resolved", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue(null);
    const el = await renderPage();
    expect(el.props.courses).toEqual([]);
    expect(el.props.errorKey).toBe("no-class");
    expect(makeListCoursesWithSummaryUseCase).not.toHaveBeenCalled();
  });

  it("propagates a repository failure key verbatim (no crash, no invented copy)", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    const el = await renderPage();
    expect(el.props.courses).toEqual([]);
    expect(el.props.errorKey).toBe("forbidden");
  });

  it("maps real summary rows end to end: href, open count and the 48h urgency cut", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    // `now` is captured inside the page, so the deadlines are pinned relative
    // to the real clock — 1h away must be urgent, 10 days away must not.
    const nowMs = Date.now();
    const soon = new Date(nowMs + 60 * 60 * 1000).toISOString();
    const far = new Date(nowMs + 10 * 24 * 60 * 60 * 1000).toISOString();

    const course = (id: string, title: string) => ({
      id,
      classId: "cl1",
      subjectId: "s1",
      title,
      status: "PUBLISHED" as const,
      isDefault: true,
      createdBy: "t1",
      updatedAt: "2026-08-02T00:00:00Z",
      publishedAt: "2026-08-02T00:00:00Z",
    });
    const nextDue = (dueAt: string) => ({
      id: "i1",
      courseId: "c1",
      itemType: "ASSIGNMENT" as const,
      refId: "i1",
      title: "Bài tập 1",
      description: null,
      url: null,
      position: 0,
      startAt: null,
      dueAt,
      state: "OPEN" as const,
      createdBy: "t1",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      exam: null,
    });

    listExec.mockResolvedValue({
      ok: true,
      data: [
        {
          course: course("c1", "Toán 10"),
          summary: { openCount: 2, nextDue: nextDue(soon) },
          itemsFailed: false,
        },
        {
          course: course("c2", "Văn 10"),
          summary: { openCount: 1, nextDue: nextDue(far) },
          itemsFailed: false,
        },
        {
          course: course("c3", "Lý 10"),
          summary: null,
          itemsFailed: true,
        },
      ],
    });

    const el = await renderPage();
    expect(el.props.errorKey).toBeNull();
    expect(el.props.courses).toHaveLength(3);
    expect(el.props.courses[0]).toMatchObject({
      id: "c1",
      title: "Toán 10",
      href: "/vi/t/t1/student/courses/c1",
      openCount: 2,
      itemsFailed: false,
      nextDue: { title: "Bài tập 1", dueSoon: true },
    });
    expect(el.props.courses[1]).toMatchObject({
      openCount: 1,
      nextDue: { dueSoon: false },
    });
    // A single failed timeline read degrades ONLY its own card.
    expect(el.props.courses[2]).toMatchObject({
      id: "c3",
      openCount: null,
      nextDue: null,
      itemsFailed: true,
    });
  });

  it("passes the class id and a single `now` instant to the use-case", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({ ok: true, data: [] });

    await renderPage();

    expect(listExec).toHaveBeenCalledWith("cl1", expect.any(Date));
  });
});
