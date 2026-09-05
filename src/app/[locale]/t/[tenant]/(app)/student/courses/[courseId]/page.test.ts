import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * QA gap-fill (US-E24.1) — `/student/courses/[courseId]` RSC wiring, end to
 * end. Same rationale as the sibling list-page tests: `bun build` never
 * executes a force-dynamic RSC body. Exercises: forbidden guard (alert, no
 * `notFound()`), `not-found` course → `notFound()` (existence-oracle rule, so
 * a denied read 404s rather than hinting the course exists), a non-not-found
 * course failure (alert, not 404), and the "degrades independently" contract:
 * a readable course with an UNREADABLE timeline still renders its header
 * (weeks falls back to `[]`, `errorKey` carries the timeline failure).
 *
 * US-E24.3 changed the read shape: the two reads are now issued IN PARALLEL
 * (`Promise.all`) and the VM is the week-grouped timeline, not a flat item list.
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
vi.mock("./actions", () => ({
  retryListItemsAction: vi.fn(),
}));
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

const ITEM = {
  id: "i1",
  courseId: "c1",
  itemType: "LESSON" as const,
  refId: "i1",
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
};

describe("StudentCourseTimelinePage — RSC wiring (US-E24.1 → US-E24.3)", () => {
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
    listItemsExec.mockResolvedValue({ ok: true, data: [] });
    await expect(renderPage()).rejects.toThrow();
  });

  it("issues both reads in parallel (the timeline read is not gated on the course read)", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({ ok: true, data: COURSE });
    listItemsExec.mockResolvedValue({ ok: true, data: [] });

    await renderPage();

    expect(getCourseExec).toHaveBeenCalledWith("c1");
    expect(listItemsExec).toHaveBeenCalledWith("c1");
  });

  it("renders an inline alert (not a 404) for a non-not-found course failure", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    listItemsExec.mockResolvedValue({ ok: true, data: [] });
    const el = (await renderPage()) as { props: { role?: string } };
    expect(el.props.role).toBe("alert");
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
        vm: {
          courseName: string;
          weeks: unknown[];
          openCount: number;
          errorKey: string | null;
        };
      };
    };
    expect(el.props.vm.courseName).toBe("Toán 10");
    expect(el.props.vm.weeks).toEqual([]);
    expect(el.props.vm.openCount).toBe(0);
    expect(el.props.vm.errorKey).toBe("forbidden");
  });

  it("maps a real course + ordered CourseItem[] into week groups end to end", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    getCourseExec.mockResolvedValue({ ok: true, data: COURSE });
    listItemsExec.mockResolvedValue({
      ok: true,
      data: [
        ITEM,
        { ...ITEM, id: "i2", startAt: "2026-04-20T07:00:00Z", state: "CLOSED" },
      ],
    });

    const el = (await renderPage()) as {
      props: {
        vm: {
          courseName: string;
          errorKey: string | null;
          openCount: number;
          mode: string;
          weeks: { key: string; items: { id: string }[] }[];
        };
      };
    };
    expect(el.props.vm.courseName).toBe("Toán 10");
    expect(el.props.vm.errorKey).toBeNull();
    expect(el.props.vm.mode).toBe("student");
    // Un-windowed item first ("Luôn mở"), then its ISO week.
    expect(el.props.vm.weeks.map((w) => w.key)).toEqual(["always", "2026-W17"]);
    expect(el.props.vm.weeks[0]?.items.map((i) => i.id)).toEqual(["i1"]);
    // Only the OPEN item counts towards the header's "N mục đang mở".
    expect(el.props.vm.openCount).toBe(1);
  });
});
