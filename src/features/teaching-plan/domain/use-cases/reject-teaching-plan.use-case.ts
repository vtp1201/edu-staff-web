import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../failures/teaching-plan.failure";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";

/** Minimum trimmed length of a rejection reason (UX + audit clarity). */
const MIN_REASON_LENGTH = 10;

/**
 * Reject a submitted plan with a reason. The reason length is validated here
 * (pure rule, no IO); the `not-submitted` rule is enforced at the repository.
 */
export class RejectTeachingPlanUseCase {
  constructor(private readonly repo: ITeachingPlanRepository) {}

  execute(planId: string, reason: string): Promise<TeachingPlan> {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      const failure: TeachingPlanFailure = { type: "invalid-rejection-reason" };
      return Promise.reject(failure);
    }
    return this.repo.rejectPlan(planId, reason);
  }
}
