import type { PlanCell } from "../entities/plan-cell.entity";
import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";

export class SavePlanCellUseCase {
  constructor(private readonly repo: ITeachingPlanRepository) {}

  execute(planId: string, cell: PlanCell): Promise<TeachingPlan> {
    return this.repo.savePlanCell(planId, cell);
  }
}
