import { describe, expect, it, vi } from "vitest";
import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../failures/teaching-plan.failure";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";
import { SubmitTeachingPlanUseCase } from "./submit-teaching-plan.use-case";

const submitted = {
  id: "plan-1",
  subjectId: "sub-toan",
  classId: "cls-10a",
  term: "HKI",
  status: "SUBMITTED",
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

describe("SubmitTeachingPlanUseCase", () => {
  it("returns the submitted plan on success", async () => {
    const submitPlan = vi.fn().mockResolvedValue(submitted);
    const useCase = new SubmitTeachingPlanUseCase(makeRepo({ submitPlan }));

    const res = await useCase.execute("plan-1");

    expect(submitPlan).toHaveBeenCalledWith("plan-1");
    expect(res.status).toBe("SUBMITTED");
  });

  it("propagates not-draft failure", async () => {
    const failure: TeachingPlanFailure = { type: "not-draft" };
    const submitPlan = vi.fn().mockRejectedValue(failure);
    const useCase = new SubmitTeachingPlanUseCase(makeRepo({ submitPlan }));

    await expect(useCase.execute("plan-1")).rejects.toEqual(failure);
  });

  it("propagates insufficient-cells failure", async () => {
    const failure: TeachingPlanFailure = { type: "insufficient-cells" };
    const submitPlan = vi.fn().mockRejectedValue(failure);
    const useCase = new SubmitTeachingPlanUseCase(makeRepo({ submitPlan }));

    await expect(useCase.execute("plan-1")).rejects.toEqual(failure);
  });
});
