import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Backlog #5 (US-E24.20) — principal half. Same defect as the teacher page
 * (`execute({})` is refused by the real repository), but a different fan-out
 * set: core's BGH branch of `ListStudentLeaveRequests` has no homeroom
 * restriction and returns EVERY state, so the set is every class in the tenant
 * (drained from the already-wired principal class repository).
 */

const getViolations = vi.fn(async () => []);
const getConduct = vi.fn(async () => []);
const getLeave = vi.fn();
const makeGetLeaveRequestsUseCase = vi.fn(async () => ({ execute: getLeave }));
const listClasses = vi.fn();
const resolveCurrentAcademicYear = vi.fn();

vi.mock("@/bootstrap/di/discipline.di", () => ({
  makeGetViolationsUseCase: async () => ({ execute: getViolations }),
  makeGetConductSummaryUseCase: async () => ({ execute: getConduct }),
  makeGetLeaveRequestsUseCase: () => makeGetLeaveRequestsUseCase(),
}));
vi.mock("@/bootstrap/di/principal-classes.di", () => ({
  makePrincipalClassesRepository: async () => ({ listClasses }),
}));
vi.mock("@/bootstrap/lib/resolve-current-term", () => ({
  resolveCurrentAcademicYear: () => resolveCurrentAcademicYear(),
}));
vi.mock("./actions", () => ({
  approveLeaveAction: vi.fn(),
  deleteViolationAction: vi.fn(),
  overrideConductGradeAction: vi.fn(),
  recordViolationAction: vi.fn(),
  rejectLeaveAction: vi.fn(),
}));

function page(
  data: { id: string; name: string }[],
  nextCursor: string | null = null,
) {
  return {
    ok: true as const,
    value: { data, nextCursor, hasMore: nextCursor !== null },
  };
}

async function renderPage() {
  const { default: Page } = await import("./page");
  return (await Page({ searchParams: Promise.resolve({ tab: "leave" }) })) as {
    props: {
      leaveRequests: { id: string; className: string }[];
      availableClasses: string[];
    };
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getViolations.mockResolvedValue([]);
  getConduct.mockResolvedValue([]);
  resolveCurrentAcademicYear.mockResolvedValue("2025-2026");
});

describe("PrincipalDisciplinePage — leave fan-out", () => {
  it("drains every class page, then fans the leave read out over ALL of them", async () => {
    listClasses
      .mockResolvedValueOnce(page([{ id: "c1", name: "10A1" }], "cur-2"))
      .mockResolvedValueOnce(page([{ id: "c2", name: "11B2" }]));
    getLeave.mockImplementation(
      async (p: { classId: string; className: string }) => [
        { id: `r-${p.classId}`, classId: p.classId, className: p.className },
      ],
    );

    const el = await renderPage();

    expect(listClasses).toHaveBeenCalledTimes(2);
    expect(listClasses.mock.calls[0][0]).toMatchObject({
      academicYear: "2025-2026",
    });
    expect(listClasses.mock.calls[1][0]).toMatchObject({ cursor: "cur-2" });
    expect(makeGetLeaveRequestsUseCase).toHaveBeenCalledTimes(1);
    expect(getLeave).toHaveBeenCalledWith({
      classId: "c1",
      className: "10A1",
    });
    expect(el.props.leaveRequests.map((r) => r.id)).toEqual(["r-c1", "r-c2"]);
    expect(el.props.leaveRequests.map((r) => r.className)).toEqual([
      "10A1",
      "11B2",
    ]);
  });

  it("one class failing does not blank the rest", async () => {
    listClasses.mockResolvedValue(
      page([
        { id: "c1", name: "10A1" },
        { id: "c2", name: "11B2" },
      ]),
    );
    getLeave.mockImplementation(async (p: { classId: string }) => {
      if (p.classId === "c1") throw { type: "network-error" };
      return [{ id: "r-c2", classId: "c2", className: "11B2" }];
    });

    const el = await renderPage();

    expect(el.props.leaveRequests.map((r) => r.id)).toEqual(["r-c2"]);
  });

  it("no active academic year degrades to an empty leave list, not a crash", async () => {
    resolveCurrentAcademicYear.mockRejectedValue(new Error("no active year"));

    const el = await renderPage();

    expect(el.props.leaveRequests).toEqual([]);
    expect(listClasses).not.toHaveBeenCalled();
    expect(getLeave).not.toHaveBeenCalled();
  });

  it("a failed class list degrades to an empty leave list", async () => {
    listClasses.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden" },
    });

    const el = await renderPage();

    expect(el.props.leaveRequests).toEqual([]);
    expect(getLeave).not.toHaveBeenCalled();
  });
});

/**
 * Backlog #17: same id-space mixing bug as the teacher page — see
 * `teacher/discipline/page.test.ts`'s equivalent describe block for the full
 * rationale. `availableClasses` must never surface a classId that only
 * exists because a real leave-request fan-out touched it.
 */
describe("PrincipalDisciplinePage — availableClasses id-space (backlog #17)", () => {
  it("never includes a classId that only exists on a leave request", async () => {
    getViolations.mockResolvedValue([
      { id: "v1", classId: "10A1" },
    ] as unknown as never[]);
    getConduct.mockResolvedValue([
      { id: "s1", classId: "11B2" },
    ] as unknown as never[]);
    listClasses.mockResolvedValue(
      page([{ id: "real-class-uuid", name: "10A1" }]),
    );
    getLeave.mockResolvedValue([
      { id: "r1", classId: "real-class-uuid", className: "10A1" },
    ]);

    const el = await renderPage();

    expect(el.props.availableClasses).toEqual(["10A1", "11B2"]);
    expect(el.props.availableClasses).not.toContain("real-class-uuid");
  });

  it("is the union of violations + conductSummary classIds only, sorted", async () => {
    getViolations.mockResolvedValue([
      { id: "v1", classId: "11B2" },
      { id: "v2", classId: "10A1" },
    ] as unknown as never[]);
    getConduct.mockResolvedValue([
      { id: "s1", classId: "10A1" },
    ] as unknown as never[]);
    listClasses.mockResolvedValue(page([]));

    const el = await renderPage();

    expect(el.props.availableClasses).toEqual(["10A1", "11B2"]);
  });
});
