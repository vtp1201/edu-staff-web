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
const itemsExec = vi.fn();
const makeListCoursesWithSummaryUseCase = vi.fn(async () => ({
  execute: listExec,
}));
const makeListCoursesWithItemsUseCase = vi.fn(async () => ({
  execute: itemsExec,
}));

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/lms.di", () => ({
  makeListCoursesWithSummaryUseCase: () => makeListCoursesWithSummaryUseCase(),
  makeListCoursesWithItemsUseCase: () => makeListCoursesWithItemsUseCase(),
  resolveMyLmsClassId: () => resolveMyLmsClassId(),
}));

async function renderPage(
  search: { view?: string; sub?: string } = {},
): Promise<{
  props: {
    view: string;
    viewHrefFor: (view: string) => string;
    courses: { id?: string }[];
    cross: {
      view: string;
      sub: string;
      hrefFor: (sub: string) => string;
      groups: Record<string, { key: string; cta: { href: string } }[]>;
    } | null;
    errorKey: string | null;
  };
}> {
  const { default: Page } = await import("./page");
  return Page({
    params: Promise.resolve({ locale: "vi", tenant: "t1" }),
    searchParams: Promise.resolve(search),
  }) as never;
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

/**
 * US-E24.4 — the same route now serves the cross-subject "Bài tập" /
 * "Bài kiểm tra" lists off `?view=`/`?sub=`. The URL IS the state, so the
 * whole feature is provable right here: params in, VM out.
 */
describe("StudentCoursesPage — cross-subject views (US-E24.4)", () => {
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

  const item = (
    id: string,
    over: Partial<{
      itemType: "ASSIGNMENT" | "EXAM" | "LESSON";
      state: "OPEN" | "CLOSED" | "UPCOMING_HIDDEN";
      dueAt: string | null;
      startAt: string | null;
      exam: { examId: string } | null;
    }> = {},
  ) => ({
    id,
    courseId: "c1",
    itemType: over.itemType ?? "ASSIGNMENT",
    refId: id,
    title: id,
    description: null,
    url: null,
    position: 0,
    startAt: over.startAt ?? null,
    dueAt: over.dueAt ?? null,
    state: over.state ?? "OPEN",
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: over.exam
      ? {
          examId: over.exam.examId,
          scheduledDate: null,
          durationMinutes: null,
          examUrl: null,
        }
      : null,
  });

  beforeEach(() => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
  });

  it("keeps the card grid (and never fans out for items) on the default view", async () => {
    listExec.mockResolvedValue({ ok: true, data: [] });
    const el = await renderPage();
    expect(el.props.view).toBe("all");
    expect(el.props.cross).toBeNull();
    expect(makeListCoursesWithItemsUseCase).not.toHaveBeenCalled();
  });

  it("reads the raw timelines (not the summary) for `?view=assignment`", async () => {
    itemsExec.mockResolvedValue({ ok: true, data: [] });
    const el = await renderPage({ view: "assignment" });
    expect(makeListCoursesWithSummaryUseCase).not.toHaveBeenCalled();
    expect(itemsExec).toHaveBeenCalledWith("cl1");
    expect(el.props.view).toBe("assignment");
    expect(el.props.cross).toMatchObject({ view: "assignment", sub: "open" });
    expect(el.props.courses).toEqual([]);
  });

  it("filters to the requested type and groups by BE state, sorted by deadline", async () => {
    itemsExec.mockResolvedValue({
      ok: true,
      data: [
        {
          course: course("c1", "Toán 10"),
          itemsFailed: false,
          items: [
            item("lesson", { itemType: "LESSON" }),
            item("late", { dueAt: "2026-12-20T00:00:00Z" }),
            item("soon", { dueAt: "2026-09-03T00:00:00Z" }),
            item("done", { state: "CLOSED", dueAt: "2026-08-01T00:00:00Z" }),
          ],
        },
      ],
    });

    const el = await renderPage({ view: "assignment" });
    const groups = el.props.cross?.groups;
    expect(groups?.open.map((row) => row.key)).toEqual(["c1:soon", "c1:late"]);
    expect(groups?.closed.map((row) => row.key)).toEqual(["c1:done"]);
    expect(groups?.upcoming).toEqual([]);
  });

  it("honours `?sub=upcoming` on the exam view and builds the exam CTA target", async () => {
    itemsExec.mockResolvedValue({
      ok: true,
      data: [
        {
          course: course("c1", "Toán 10"),
          itemsFailed: false,
          items: [
            item("ex-open", {
              itemType: "EXAM",
              exam: { examId: "ex-9" },
            }),
            item("ex-later", {
              itemType: "EXAM",
              state: "UPCOMING_HIDDEN",
              startAt: "2026-10-01T00:00:00Z",
            }),
          ],
        },
      ],
    });

    const el = await renderPage({ view: "exam", sub: "upcoming" });
    expect(el.props.cross?.sub).toBe("upcoming");
    expect(el.props.cross?.groups.upcoming.map((row) => row.key)).toEqual([
      "c1:ex-later",
    ]);
    expect(el.props.cross?.groups.open[0]?.cta.href).toBe(
      "/vi/t/t1/student/exams/ex-9",
    );
  });

  it("falls back to `open` when `?sub=upcoming` is asked for on the assignment view (D7)", async () => {
    itemsExec.mockResolvedValue({ ok: true, data: [] });
    const el = await renderPage({ view: "assignment", sub: "upcoming" });
    expect(el.props.cross?.sub).toBe("open");
  });

  it("renders the default view for an unknown `?view=` instead of failing", async () => {
    listExec.mockResolvedValue({ ok: true, data: [] });
    const el = await renderPage({ view: "nonsense" });
    expect(el.props.view).toBe("all");
  });

  it("builds `?view=`/`?sub=` links that preserve locale, tenant and the view", async () => {
    itemsExec.mockResolvedValue({ ok: true, data: [] });
    const el = await renderPage({ view: "exam" });
    expect(el.props.viewHrefFor("all")).toBe("/vi/t/t1/student/courses");
    expect(el.props.viewHrefFor("assignment")).toBe(
      "/vi/t/t1/student/courses?view=assignment",
    );
    expect(el.props.cross?.hrefFor("closed")).toBe(
      "/vi/t/t1/student/courses?view=exam&sub=closed",
    );
  });

  it("propagates a cross-subject read failure as an errorKey, with no list", async () => {
    itemsExec.mockResolvedValue({ ok: false, failure: { type: "unknown" } });
    const el = await renderPage({ view: "exam" });
    expect(el.props.errorKey).toBe("unknown");
    expect(el.props.cross).toBeNull();
    // The pill row still renders, so the reader is not stranded in a dead view.
    expect(el.props.view).toBe("exam");
  });
});
