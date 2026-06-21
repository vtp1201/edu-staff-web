import { describe, expect, it, vi } from "vitest";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../entities/conduct-summary.entity";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";
import { OverrideConductGradeUseCase } from "./override-conduct-grade.use-case";

const summary: ConductSummaryEntity = {
  studentId: "s-1",
  studentName: "Phạm Đức Dũng",
  initials: "PD",
  avatarTone: "error",
  classId: "10A1",
  className: "10A1",
  violationCount: 4,
  unexcusedAbsences: 8,
  points: 55,
  grade: "good",
  isOverridden: true,
  overrideNote: "Đã có tiến bộ rõ rệt",
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

describe("OverrideConductGradeUseCase", () => {
  it("overrides the conduct grade with a note", async () => {
    const overrideConductGrade = vi.fn().mockResolvedValue(summary);
    const useCase = new OverrideConductGradeUseCase(
      makeRepo({ overrideConductGrade }),
    );

    const res = await useCase.execute("s-1", "good", "Đã có tiến bộ rõ rệt");

    expect(overrideConductGrade).toHaveBeenCalledWith(
      "s-1",
      "good",
      "Đã có tiến bộ rõ rệt",
    );
    expect(res.isOverridden).toBe(true);
  });

  it("fails with invalid-conduct-grade for an unknown grade", async () => {
    const overrideConductGrade = vi.fn();
    const useCase = new OverrideConductGradeUseCase(
      makeRepo({ overrideConductGrade }),
    );

    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard
      useCase.execute("s-1", "amazing" as any as ConductGrade, "note dài đủ"),
    ).rejects.toMatchObject({ type: "invalid-conduct-grade" });
    expect(overrideConductGrade).not.toHaveBeenCalled();
  });

  it("fails with missing-description when note is blank", async () => {
    const useCase = new OverrideConductGradeUseCase(makeRepo());

    await expect(useCase.execute("s-1", "good", "  ")).rejects.toMatchObject({
      type: "missing-description",
    });
  });
});
