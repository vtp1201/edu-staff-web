import { describe, expect, it, vi } from "vitest";
import type { PlanCell } from "../entities/plan-cell.entity";
import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";
import { SavePlanCellUseCase } from "./save-plan-cell.use-case";

const cell: PlanCell = { week: 1, period: 1, title: "Đạo hàm" };

const plan = {
  id: "plan-1",
  subjectId: "sub-toan",
  classId: "cls-10a",
  term: "HKI",
  status: "DRAFT",
  teacherMemberId: "m-1",
  weeks: 35,
  periodsPerWeek: 3,
  cells: [cell],
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

describe("SavePlanCellUseCase", () => {
  it("delegates the upsert to repo.savePlanCell", async () => {
    const savePlanCell = vi.fn().mockResolvedValue(plan);
    const useCase = new SavePlanCellUseCase(makeRepo({ savePlanCell }));

    const res = await useCase.execute("plan-1", cell);

    expect(savePlanCell).toHaveBeenCalledWith("plan-1", cell);
    expect(res.cells).toContainEqual(cell);
  });
});
