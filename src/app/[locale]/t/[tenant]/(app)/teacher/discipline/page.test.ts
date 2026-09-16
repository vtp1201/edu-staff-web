import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Backlog #5 (US-E24.20): the leave tab called `execute({})`, which the real
 * repository REFUSES before any HTTP (core requires exactly one of
 * `classId`/`studentMemberId`) — the page's `try/catch` swallowed it and the
 * tab silently rendered empty. The page now fans the read out over the
 * teacher's OWN homeroom classes, the only set a GVCN is authorized to read.
 */

const getViolations = vi.fn(async () => []);
const getConduct = vi.fn(async () => []);
const getLeave = vi.fn();
const makeGetLeaveRequestsUseCase = vi.fn(async () => ({ execute: getLeave }));
const listMyClasses = vi.fn();

vi.mock("@/bootstrap/di/discipline.di", () => ({
  makeGetViolationsUseCase: async () => ({ execute: getViolations }),
  makeGetConductSummaryUseCase: async () => ({ execute: getConduct }),
  makeGetLeaveRequestsUseCase: () => makeGetLeaveRequestsUseCase(),
}));
vi.mock("@/bootstrap/di/teacher-class.di", () => ({
  makeListMyTeacherClassesUseCase: async () => ({ execute: listMyClasses }),
}));
vi.mock("./actions", () => ({
  approveLeaveAction: vi.fn(),
  deleteViolationAction: vi.fn(),
  overrideConductGradeAction: vi.fn(),
  recordViolationAction: vi.fn(),
  rejectLeaveAction: vi.fn(),
}));

function teacherClass(id: string, name: string, roles: string[]) {
  return { id, name, roles };
}

function leaveRow(id: string, classId: string, className: string) {
  return { id, classId, className, status: "pending" };
}

async function renderPage() {
  const { default: Page } = await import("./page");
  return (await Page({ searchParams: Promise.resolve({ tab: "leave" }) })) as {
    props: { leaveRequests: { id: string; className: string }[] };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getViolations.mockResolvedValue([]);
  getConduct.mockResolvedValue([]);
});

describe("TeacherDisciplinePage — leave fan-out", () => {
  it("fans out over the HOMEROOM classes only, stamping each class label", async () => {
    listMyClasses.mockResolvedValue({
      ok: true,
      data: [
        teacherClass("c1", "10A1", ["homeroom", "subject"]),
        teacherClass("c2", "11B2", ["subject"]),
      ],
    });
    getLeave.mockResolvedValue([leaveRow("r1", "c1", "10A1")]);

    const el = await renderPage();

    expect(getLeave).toHaveBeenCalledTimes(1);
    expect(getLeave).toHaveBeenCalledWith({
      classId: "c1",
      className: "10A1",
    });
    expect(el.props.leaveRequests.map((r) => r.id)).toEqual(["r1"]);
  });

  it("builds the use-case ONCE and reuses it across the fan-out", async () => {
    listMyClasses.mockResolvedValue({
      ok: true,
      data: [
        teacherClass("c1", "10A1", ["homeroom"]),
        teacherClass("c2", "11B2", ["homeroom"]),
      ],
    });
    getLeave.mockResolvedValue([]);

    await renderPage();

    expect(makeGetLeaveRequestsUseCase).toHaveBeenCalledTimes(1);
    expect(getLeave).toHaveBeenCalledTimes(2);
  });

  it("one class failing does not blank the others (settle per class)", async () => {
    listMyClasses.mockResolvedValue({
      ok: true,
      data: [
        teacherClass("c1", "10A1", ["homeroom"]),
        teacherClass("c2", "11B2", ["homeroom"]),
      ],
    });
    getLeave.mockImplementation(async (p: { classId: string }) => {
      if (p.classId === "c1") throw { type: "forbidden" };
      return [leaveRow("r2", "c2", "11B2")];
    });

    const el = await renderPage();

    expect(el.props.leaveRequests.map((r) => r.id)).toEqual(["r2"]);
    expect(el.props.leaveRequests[0].className).toBe("11B2");
  });

  it("no homeroom class → empty list and NO refused call", async () => {
    listMyClasses.mockResolvedValue({
      ok: true,
      data: [teacherClass("c2", "11B2", ["subject"])],
    });

    const el = await renderPage();

    expect(el.props.leaveRequests).toEqual([]);
    expect(getLeave).not.toHaveBeenCalled();
  });

  it("a failed class read degrades to an empty leave list, not a crash", async () => {
    listMyClasses.mockResolvedValue({ ok: false, error: { type: "unknown" } });

    const el = await renderPage();

    expect(el.props.leaveRequests).toEqual([]);
    expect(getLeave).not.toHaveBeenCalled();
  });
});
