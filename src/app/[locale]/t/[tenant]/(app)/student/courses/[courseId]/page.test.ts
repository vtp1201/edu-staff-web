import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * QA gap-fill (US-E24.1) — `/student/courses/[courseId]` RSC wiring, end to
 * end. Same rationale as the sibling list-page tests: `bun build` never
 * executes a force-dynamic RSC body. Exercises: forbidden guard (alert, no
 * `notFound()`), `not-found` course → `notFound()` (existence-oracle rule, so
 * a denied read 404s rather than hinting the course exists), a non-not-found
 * course failure (alert, not 404), and the "degrades independently" contract:
 * a readable course with an UNREADABLE timeline still renders its header
 * (items falls back to `[]`, `errorKey` carries the timeline failure).
 */

const requireRole = vi.fn();
const getCourseExec = vi.fn();
const listItemsExec = vi.fn();

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/lms.di", () => ({
  makeGetCourseUseCase: async () => ({ execute: getCourseExec }),
  makeListCourseItemsUseCase: async () => ({ execute: listItemsExec }),
}));
vi.mock("./actions", () => ({ getLessonAction: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

async function renderPage() {
  const { default: Page } = await import("./page");
  return Page({
    params: Promise.resolve({ locale: "vi", tenant: "t1", courseId: "c1" }),
  });
}

beforeEach(() => vi.clearAllMocks());

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

describe("StudentCourseTimelinePage — RSC wiring (US-E24.1)", () => {
  it("rejects a non-student with an inline alert, never calling the DI layer", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "wrong-role" });
    const el = (await renderPage()) as { props: { role?: string } };
    expect(el.props.role).toBe("alert");
    expect(getCourseExec).not.toHaveBeenCalled();
  });

  it("404s (never an in-page hint) on a not-found course — existence-oracle rule", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({
      ok: false,
      failure: { type: "not-found" },
    });
    await expect(renderPage()).rejects.toThrow();
    expect(listItemsExec).not.toHaveBeenCalled();
  });

  it("renders an inline alert (not a 404) for a non-not-found course failure", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const el = (await renderPage()) as { props: { role?: string } };
    expect(el.props.role).toBe("alert");
    expect(listItemsExec).not.toHaveBeenCalled();
  });

  it("degrades independently: a readable course with an unreadable timeline still renders", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({ ok: true, data: COURSE });
    listItemsExec.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden" },
    });
    const el = (await renderPage()) as {
      props: {
        vm: { courseName: string; items: unknown[]; errorKey: string | null };
      };
    };
    expect(el.props.vm.courseName).toBe("Toán 10");
    expect(el.props.vm.items).toEqual([]);
    expect(el.props.vm.errorKey).toBe("forbidden");
  });

  it("maps a real course + ordered CourseItem[] end to end without throwing", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({ ok: true, data: COURSE });
    listItemsExec.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "i1",
          courseId: "c1",
          itemType: "LESSON",
          refId: "i1",
          title: "Bài 1",
          description: null,
          url: null,
          position: 0,
          startAt: null,
          dueAt: null,
          state: "OPEN",
          createdBy: "t1",
          createdAt: "2026-08-01T00:00:00Z",
          updatedAt: "2026-08-01T00:00:00Z",
          exam: null,
        },
      ],
    });

    const el = (await renderPage()) as {
      props: {
        vm: {
          courseName: string;
          errorKey: string | null;
          items: unknown[];
          initialLessonId: string | null;
        };
      };
    };
    expect(el.props.vm.courseName).toBe("Toán 10");
    expect(el.props.vm.errorKey).toBeNull();
    expect(el.props.vm.items).toHaveLength(1);
    expect(el.props.vm.initialLessonId).toBe("i1");
  });
});
