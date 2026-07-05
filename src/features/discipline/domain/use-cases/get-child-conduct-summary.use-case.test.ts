import { describe, expect, it, vi } from "vitest";
import type { ConductSummaryEntity } from "../entities/conduct-summary.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { GetChildConductSummaryUseCase } from "./get-child-conduct-summary.use-case";

const summaryC1: ConductSummaryEntity = {
  studentId: "c1",
  studentName: "Nguyễn Minh Khoa",
  initials: "NK",
  avatarTone: "primary",
  classId: "11A2",
  className: "11A2",
  violationCount: 2,
  unexcusedAbsences: 1,
  points: 82,
  grade: "good",
  isOverridden: false,
  overrideNote: null,
  semester: "HK1",
};

function makeRepo(
  over: Partial<IDisciplineRepository> = {},
): IDisciplineRepository {
  return {
    getViolations: vi.fn(),
    recordViolation: vi.fn(),
    deleteViolation: vi.fn(),
    getConductSummary: vi.fn(),
    overrideConductGrade: vi.fn(),
    getLeaveRequests: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    getMyConductSummary: vi.fn(),
    getMyViolations: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    submitLeaveRequest: vi.fn(),
    getChildren: vi.fn(),
    getChildConductSummary: vi.fn(),
    getChildViolations: vi.fn(),
    getChildLeaveRequests: vi.fn(),
    submitLeaveForChild: vi.fn(),
    ...over,
  };
}

describe("GetChildConductSummaryUseCase", () => {
  it("returns the conduct summary for c1 (score 82, good)", async () => {
    const getChildConductSummary = vi.fn().mockResolvedValue(summaryC1);
    const useCase = new GetChildConductSummaryUseCase(
      makeRepo({ getChildConductSummary }),
    );

    const res = await useCase.execute("c1");

    expect(getChildConductSummary).toHaveBeenCalledWith("c1");
    expect(res.points).toBe(82);
    expect(res.grade).toBe("good");
  });

  it("returns the conduct summary for c2 (score 94, excellent)", async () => {
    const getChildConductSummary = vi
      .fn()
      .mockResolvedValue({ ...summaryC1, points: 94, grade: "excellent" });
    const useCase = new GetChildConductSummaryUseCase(
      makeRepo({ getChildConductSummary }),
    );

    const res = await useCase.execute("c2");

    expect(res.points).toBe(94);
    expect(res.grade).toBe("excellent");
  });

  it("rejects with invalid-child when childId is empty", async () => {
    const getChildConductSummary = vi.fn();
    const useCase = new GetChildConductSummaryUseCase(
      makeRepo({ getChildConductSummary }),
    );

    await expect(useCase.execute("")).rejects.toMatchObject({
      type: "invalid-child",
    });
    expect(getChildConductSummary).not.toHaveBeenCalled();
  });

  it("propagates a not-found failure thrown by the repo", async () => {
    const failure: DisciplineFailure = { type: "not-found" };
    const getChildConductSummary = vi.fn().mockRejectedValue(failure);
    const useCase = new GetChildConductSummaryUseCase(
      makeRepo({ getChildConductSummary }),
    );

    await expect(useCase.execute("c9")).rejects.toMatchObject({
      type: "not-found",
    });
  });

  it("propagates a forbidden failure thrown by the repo", async () => {
    const failure: DisciplineFailure = { type: "forbidden" };
    const getChildConductSummary = vi.fn().mockRejectedValue(failure);
    const useCase = new GetChildConductSummaryUseCase(
      makeRepo({ getChildConductSummary }),
    );

    await expect(useCase.execute("c1")).rejects.toMatchObject({
      type: "forbidden",
    });
  });
});
