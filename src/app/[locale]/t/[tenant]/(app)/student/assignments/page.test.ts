import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * QA gap-fill (US-E24.1) — `/student/assignments` RSC wiring, end to end.
 * Same rationale as the `courses/page.test.ts` sibling: `bun build` never
 * executes a force-dynamic RSC body, so the "no crash, real shape" claim was
 * unproven. Exercises: forbidden guard, `no-class`, a `forbidden` repository
 * failure, a non-forbidden failure (leaves `assignments` null for client
 * cold-fetch/retry per the page's own comment), and a real
 * `AssignmentSummary[]` success path.
 */

const requireRole = vi.fn();
const resolveMyLmsClassId = vi.fn();
const listExec = vi.fn();
const makeListAssignmentsUseCase = vi.fn(async () => ({ execute: listExec }));

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/lms.di", () => ({
  makeListAssignmentsUseCase: () => makeListAssignmentsUseCase(),
  resolveMyLmsClassId: () => resolveMyLmsClassId(),
}));
vi.mock("./actions", () => ({
  listAssignmentsAction: vi.fn(),
  getAssignmentDetailAction: vi.fn(),
  submitAssignmentAction: vi.fn(),
}));

async function renderPage() {
  const { default: Page } = await import("./page");
  return (await Page()) as unknown as {
    props: {
      assignments: unknown[] | null;
      errorKey: string | null;
    };
  };
}

beforeEach(() => vi.clearAllMocks());

describe("StudentAssignmentsPage — RSC wiring (US-E24.1)", () => {
  it("rejects a non-student with a forbidden VM, never calling DI/class resolver", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "wrong-role" });
    const el = await renderPage();
    expect(el.props.assignments).toEqual([]);
    expect(el.props.errorKey).toBe("forbidden");
    expect(resolveMyLmsClassId).not.toHaveBeenCalled();
    expect(makeListAssignmentsUseCase).not.toHaveBeenCalled();
  });

  it("seeds `no-class` when the class cannot be resolved", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue(null);
    const el = await renderPage();
    expect(el.props.assignments).toEqual([]);
    expect(el.props.errorKey).toBe("no-class");
  });

  it("surfaces a forbidden repository failure as an errorKey (assignments stays null)", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });
    const el = await renderPage();
    expect(el.props.assignments).toBeNull();
    expect(el.props.errorKey).toBe("forbidden");
  });

  it("leaves `assignments` null (not []) on a non-forbidden failure, for client retry", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    const el = await renderPage();
    expect(el.props.assignments).toBeNull();
    expect(el.props.errorKey).toBeNull();
  });

  it("maps a real AssignmentSummary[] end to end without throwing", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "student" });
    resolveMyLmsClassId.mockResolvedValue("cl1");
    listExec.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "a1",
          classId: "cl1",
          subjectId: "s1",
          courseId: "c1",
          title: "Bài tập 1",
          dueAt: "2026-09-10T00:00:00Z",
          createdBy: "t1",
          updatedAt: "2026-09-01T00:00:00Z",
        },
        {
          id: "a2",
          classId: "cl1",
          subjectId: "s2",
          courseId: null,
          title: "Bài tập không hạn",
          dueAt: null,
          createdBy: "t1",
          updatedAt: "2026-09-01T00:00:00Z",
        },
      ],
    });

    const el = await renderPage();
    expect(el.props.errorKey).toBeNull();
    expect(el.props.assignments).toHaveLength(2);
    expect(el.props.assignments?.[1]).toMatchObject({
      id: "a2",
      courseId: null,
      dueAt: null,
    });
  });
});
