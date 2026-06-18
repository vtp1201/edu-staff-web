import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";

/**
 * Submit a draft plan for approval. The `not-draft` and `insufficient-cells`
 * business rules are enforced at the repository (which holds the plan state)
 * and surface as a {@link TeachingPlanFailure}; this use-case propagates them.
 */
export class SubmitTeachingPlanUseCase {
  constructor(private readonly repo: ITeachingPlanRepository) {}

  execute(planId: string): Promise<TeachingPlan> {
    return this.repo.submitPlan(planId);
  }
}
