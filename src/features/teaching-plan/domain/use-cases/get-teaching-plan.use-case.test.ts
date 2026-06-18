import { describe, expect, it, vi } from "vitest";
import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";
import { GetTeachingPlanUseCase } from "./get-teaching-plan.use-case";

const plan = {
  id: "plan-1",
  subjectId: "sub-toan",
  classId: "cls-10a",
  term: "HKI",
  status: "DRAFT",
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

describe("GetTeachingPlanUseCase", () => {
  it("returns the plan when found", async () => {
    const getTeachingPlan = vi.fn().mockResolvedValue(plan);
    const useCase = new GetTeachingPlanUseCase(makeRepo({ getTeachingPlan }));

    const res = await useCase.execute("sub-toan", "cls-10a", "HKI");

    expect(getTeachingPlan).toHaveBeenCalledWith("sub-toan", "cls-10a", "HKI");
    expect(res?.id).toBe("plan-1");
  });

  it("returns null when no plan exists", async () => {
    const getTeachingPlan = vi.fn().mockResolvedValue(null);
    const useCase = new GetTeachingPlanUseCase(makeRepo({ getTeachingPlan }));

    const res = await useCase.execute("sub-x", "cls-x", "HKII");

    expect(res).toBeNull();
  });
});
