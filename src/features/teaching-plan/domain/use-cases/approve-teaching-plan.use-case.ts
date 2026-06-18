import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";

/**
 * Approve a submitted plan. The `not-submitted` rule is enforced at the
 * repository and surfaces as a {@link TeachingPlanFailure}; propagated here.
 */
export class ApproveTeachingPlanUseCase {
  constructor(private readonly repo: ITeachingPlanRepository) {}

  execute(planId: string): Promise<TeachingPlan> {
    return this.repo.approvePlan(planId);
  }
}
