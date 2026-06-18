import { describe, expect, it, vi } from "vitest";
import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../failures/teaching-plan.failure";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";
import { RejectTeachingPlanUseCase } from "./reject-teaching-plan.use-case";

const rejected = {
  id: "plan-1",
  subjectId: "sub-toan",
  classId: "cls-10a",
  term: "HKI",
  status: "REJECTED",
  teacherMemberId: "m-1",
  rejectionReason: "Chưa đủ nội dung phân phối chương trình",
  weeks: 35,
  periodsPerWeek: 3,
  cells: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies TeachingPlan;

const validReason = "Chưa đủ nội dung phân phối chương trình";

function makeRepo(
  over: Partial<ITeachingPlanRepository> = {},
): ITeachingPlanRepository {
  return {
    getTeachingPlan: vi.fn(),
    savePlanCell: vi.fn(),
    submitPlan: vi.fn(),
    approvePlan: vi.fn(),
    rejectPlan: vi.fn(),
    listPendingPlans: vi.fn(),
    ...over,
  };
}

describe("RejectTeachingPlanUseCase", () => {
  it("returns the rejected plan on success", async () => {
    const rejectPlan = vi.fn().mockResolvedValue(rejected);
    const useCase = new RejectTeachingPlanUseCase(makeRepo({ rejectPlan }));

    const res = await useCase.execute("plan-1", validReason);

    expect(rejectPlan).toHaveBeenCalledWith("plan-1", validReason);
    expect(res.status).toBe("REJECTED");
  });

  it("throws invalid-rejection-reason when reason < 10 chars (after trim)", async () => {
    const rejectPlan = vi.fn();
    const useCase = new RejectTeachingPlanUseCase(makeRepo({ rejectPlan }));

    const failure: TeachingPlanFailure = { type: "invalid-rejection-reason" };
    await expect(useCase.execute("plan-1", "   short  ")).rejects.toEqual(
      failure,
    );
    expect(rejectPlan).not.toHaveBeenCalled();
  });

  it("propagates not-submitted failure from repo", async () => {
    const failure: TeachingPlanFailure = { type: "not-submitted" };
    const rejectPlan = vi.fn().mockRejectedValue(failure);
    const useCase = new RejectTeachingPlanUseCase(makeRepo({ rejectPlan }));

    await expect(useCase.execute("plan-1", validReason)).rejects.toEqual(
      failure,
    );
  });
});
