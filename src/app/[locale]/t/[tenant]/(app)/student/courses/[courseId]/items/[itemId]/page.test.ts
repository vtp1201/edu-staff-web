import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/student/courses/[courseId]/items/[itemId]` — the course player's RSC
 * composition (US-E24.5). `bun build` never executes a force-dynamic RSC body,
 * so every branch is proven here: guard, course 404, item 404 (an id that is
 * not in the course's own item list), timeline-read failure, the per-type body
 * reads (lesson / assignment / document / exam), the locked (D7) branch, and
 * prev/next resolution from flat item order.
 */

const requireRole = vi.fn();
const getCourseExec = vi.fn();
const listItemsExec = vi.fn();
const getLessonExec = vi.fn();
const getAssignmentExec = vi.fn();

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/lms.di", () => ({
  makeGetCourseUseCase: async () => ({ execute: getCourseExec }),
  makeListCourseItemsUseCase: async () => ({ execute: listItemsExec }),
  makeGetLessonUseCase: async () => ({ execute: getLessonExec }),
  makeGetAssignmentDetailUseCase: async () => ({ execute: getAssignmentExec }),
}));
vi.mock("./actions", () => ({
  submitAssignmentAction: Object.assign(vi.fn(), {
    bind: () => "BOUND_SUBMIT",
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

const COURSE = {
  id: "c1",
  classId: "cl1",
  subjectId: "s1",
  title: "Toán 10",
  description: "Mô tả",
  status: "PUBLISHED" as const,
  isDefault: true,
  createdBy: "t1",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-02T00:00:00Z",
  publishedAt: "2026-08-02T00:00:00Z",
};

function item(over: Record<string, unknown> = {}) {
  return {
    id: "i1",
    courseId: "c1",
    itemType: "LESSON" as const,
    refId: "le-1",
    title: "Bài 1",
    description: null,
    url: null,
    position: 0,
    startAt: null,
    dueAt: null,
    state: "OPEN" as const,
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: null,
    ...over,
  };
}

const LESSON = {
  id: "le-1",
  courseId: "c1",
  title: "Bài 1",
  content: "Nội dung bài giảng.",
  position: 0,
  startAt: null,
  dueAt: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

interface RenderedProps {
  vm: {
    courseName: string;
    courseHref: string;
    activeItemId: string;
    activeItem: Record<string, unknown>;
    weeks: { key: string; items: { id: string }[] }[];
    prevHref: string | null;
    nextHref: string | null;
    activeItemErrorKey: string | null;
  };
  submitAssignment: unknown;
  role?: string;
}

async function renderPage(itemId = "i1") {
  const { default: Page } = await import("./page");
  return (await Page({
    params: Promise.resolve({
      locale: "vi",
      tenant: "t1",
      courseId: "c1",
      itemId,
    }),
  })) as { props: RenderedProps };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ ok: true, role: "student" });
  getCourseExec.mockResolvedValue({ ok: true, data: COURSE });
  listItemsExec.mockResolvedValue({ ok: true, data: [item()] });
  getLessonExec.mockResolvedValue({ ok: true, data: LESSON });
});

describe("StudentCourseItemPage — guards and 404s", () => {
  it("rejects a non-student with an inline alert, never touching the DI layer", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "wrong-role" });
    const el = await renderPage();
    expect(el.props.role).toBe("alert");
    expect(getCourseExec).not.toHaveBeenCalled();
  });

  it("404s on a not-found course (existence-oracle rule)", async () => {
    getCourseExec.mockResolvedValue({
      ok: false,
      failure: { type: "not-found" },
    });
    await expect(renderPage()).rejects.toThrow();
  });

  it("404s when the itemId is not part of THIS course's item list", async () => {
    await expect(renderPage("not-mine")).rejects.toThrow();
  });

  it("renders an alert (not a 404) when the item list itself is unreadable", async () => {
    listItemsExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const el = await renderPage();
    expect(el.props.role).toBe("alert");
  });
});

describe("StudentCourseItemPage — body composition by item type", () => {
  it("reads the LESSON body server-side and passes it as plain text", async () => {
    const el = await renderPage();
    expect(getLessonExec).toHaveBeenCalledWith("c1", "le-1");
    expect(el.props.vm.activeItem).toMatchObject({
      kind: "lesson",
      content: "Nội dung bài giảng.",
    });
    expect(el.props.vm.activeItemErrorKey).toBeNull();
    // No submit affordance can exist on a lesson.
    expect(el.props.submitAssignment).toBeNull();
  });

  it("degrades the BODY only when the lesson read fails (header/sidebar survive)", async () => {
    getLessonExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const el = await renderPage();
    expect(el.props.vm.activeItemErrorKey).toBe("network-error");
    expect(el.props.vm.courseName).toBe("Toán 10");
    expect(el.props.vm.weeks[0]?.items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("composes ASSIGNMENT + my submission through ONE detail read", async () => {
    listItemsExec.mockResolvedValue({
      ok: true,
      data: [item({ itemType: "ASSIGNMENT", refId: "as-1" })],
    });
    getAssignmentExec.mockResolvedValue({
      ok: true,
      data: {
        assignment: {
          id: "as-1",
          instructions: "Làm bài 1–5",
          state: "OPEN",
          startAt: null,
          dueAt: "2026-08-20T16:00:00Z",
        },
        mySubmission: {
          assignmentId: "as-1",
          studentUserId: "u1",
          content: "Bài làm",
          status: "SUBMITTED",
          submittedAt: "2026-08-19T10:00:00Z",
        },
      },
    });

    const el = await renderPage();

    expect(getAssignmentExec).toHaveBeenCalledWith("as-1");
    expect(el.props.vm.activeItem).toMatchObject({
      kind: "assignment",
      instructions: "Làm bài 1–5",
      // Only the two fields the banner renders cross the boundary.
      mySubmission: {
        content: "Bài làm",
        submittedAt: "2026-08-19T10:00:00Z",
      },
    });
    // The action reaches presentation ALREADY bound to the assignment id, so
    // the client can never name a different assignment.
    expect(el.props.submitAssignment).toBe("BOUND_SUBMIT");
  });

  it("renders DOCUMENT/EXAM straight from the item row — no extra read", async () => {
    listItemsExec.mockResolvedValue({
      ok: true,
      data: [
        item({
          id: "i1",
          itemType: "DOCUMENT",
          refId: null,
          url: "https://example.edu.vn/a.pdf",
          description: "Tài liệu",
        }),
        item({
          id: "i2",
          itemType: "EXAM",
          refId: "ex-1",
          exam: {
            examId: "ex-1",
            scheduledDate: null,
            durationMinutes: 45,
            examUrl: "https://example.edu.vn/exams/ex-1",
          },
        }),
      ],
    });

    const doc = await renderPage("i1");
    expect(doc.props.vm.activeItem).toMatchObject({
      kind: "document",
      url: "https://example.edu.vn/a.pdf",
    });

    const exam = await renderPage("i2");
    expect(exam.props.vm.activeItem).toMatchObject({
      kind: "exam",
      examUrl: "https://example.edu.vn/exams/ex-1",
      // In-app review route, resolved server-side from the exam id.
      examHref: "/vi/t/t1/student/exams/ex-1",
      examDurationMinutes: 45,
    });
    expect(getLessonExec).not.toHaveBeenCalled();
    expect(getAssignmentExec).not.toHaveBeenCalled();
  });

  it("renders the LOCKED branch for an unreleased EXAM without reading anything else (D7)", async () => {
    listItemsExec.mockResolvedValue({
      ok: true,
      data: [
        item({
          itemType: "EXAM",
          refId: "ex-1",
          state: "UPCOMING_HIDDEN",
          startAt: "2026-09-08T02:00:00Z",
          exam: {
            examId: "ex-1",
            scheduledDate: "2026-09-08T02:00:00Z",
            durationMinutes: 45,
            examUrl: "https://example.edu.vn/exams/ex-1",
          },
        }),
      ],
    });

    const el = await renderPage();

    expect(el.props.vm.activeItem).toEqual({
      kind: "locked",
      id: "i1",
      title: "Bài 1",
      itemType: "EXAM",
      opensAt: "2026-09-08T02:00:00Z",
    });
    expect(el.props.submitAssignment).toBeNull();
  });
});

describe("StudentCourseItemPage — navigation", () => {
  it("resolves prev/next from flat item order and nulls them at the ends", async () => {
    listItemsExec.mockResolvedValue({
      ok: true,
      data: [
        item({ id: "i1" }),
        item({ id: "i2", startAt: "2026-04-20T07:00:00Z" }),
        item({ id: "i3", startAt: "2026-04-27T07:00:00Z" }),
      ],
    });

    const first = await renderPage("i1");
    expect(first.props.vm.prevHref).toBeNull();
    expect(first.props.vm.nextHref).toBe(
      "/vi/t/t1/student/courses/c1/items/i2",
    );

    const middle = await renderPage("i2");
    expect(middle.props.vm.prevHref).toBe(
      "/vi/t/t1/student/courses/c1/items/i1",
    );
    expect(middle.props.vm.nextHref).toBe(
      "/vi/t/t1/student/courses/c1/items/i3",
    );

    const last = await renderPage("i3");
    expect(last.props.vm.nextHref).toBeNull();
    expect(last.props.vm.courseHref).toBe("/vi/t/t1/student/courses/c1");
  });
});
