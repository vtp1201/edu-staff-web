import { describe, expect, it, vi } from "vitest";
import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../failures/teaching-plan.failure";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";
import { ApproveTeachingPlanUseCase } from "./approve-teaching-plan.use-case";

const approved = {
  id: "plan-1",
  subjectId: "sub-toan",
  classId: "cls-10a",
  term: "HKI",
  status: "APPROVED",
  teacherMemberId: "m-1",
  weeks: 35,
  periodsPerWeek: 3,
  cells: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies TeachingPlan;

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

describe("ApproveTeachingPlanUseCase", () => {
  it("returns the approved plan on success", async () => {
    const approvePlan = vi.fn().mockResolvedValue(approved);
    const useCase = new ApproveTeachingPlanUseCase(makeRepo({ approvePlan }));

    const res = await useCase.execute("plan-1");

    expect(approvePlan).toHaveBeenCalledWith("plan-1");
    expect(res.status).toBe("APPROVED");
  });

  it("propagates not-submitted failure", async () => {
    const failure: TeachingPlanFailure = { type: "not-submitted" };
    const approvePlan = vi.fn().mockRejectedValue(failure);
    const useCase = new ApproveTeachingPlanUseCase(makeRepo({ approvePlan }));

    await expect(useCase.execute("plan-1")).rejects.toEqual(failure);
  });
});
