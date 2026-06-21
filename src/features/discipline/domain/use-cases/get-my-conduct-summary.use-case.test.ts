import { describe, expect, it, vi } from "vitest";
import type { ConductSummaryEntity } from "../entities/conduct-summary.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { GetMyConductSummaryUseCase } from "./get-my-conduct-summary.use-case";

const summary: ConductSummaryEntity = {
  studentId: "s-1",
  studentName: "Trần Văn Bình",
  initials: "TB",
  avatarTone: "teal",
  classId: "11B2",
  className: "11B2",
  violationCount: 2,
  unexcusedAbsences: 3,
  points: 78,
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

describe("GetMyConductSummaryUseCase", () => {
  it("delegates to the repo with studentId + semester", async () => {
    const getMyConductSummary = vi.fn().mockResolvedValue(summary);
    const useCase = new GetMyConductSummaryUseCase(
      makeRepo({ getMyConductSummary }),
    );

    const res = await useCase.execute("s-1", "HK1");

    expect(getMyConductSummary).toHaveBeenCalledWith("s-1", "HK1");
    expect(res.studentId).toBe("s-1");
  });
});
