import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type {
  ITeachingPlanRepository,
  PendingPlansFilter,
} from "../repositories/i-teaching-plan.repository";

/** Principal queue: plans awaiting approval (SUBMITTED), optionally filtered. */
export class ListPendingTeachingPlansUseCase {
  constructor(private readonly repo: ITeachingPlanRepository) {}

  execute(filter: PendingPlansFilter = {}): Promise<TeachingPlan[]> {
    return this.repo.listPendingPlans(filter);
  }
}
