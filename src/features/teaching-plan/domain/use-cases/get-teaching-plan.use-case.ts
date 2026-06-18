import type { TeachingPlan } from "../entities/teaching-plan.entity";
import type { ITeachingPlanRepository } from "../repositories/i-teaching-plan.repository";

export class GetTeachingPlanUseCase {
  constructor(private readonly repo: ITeachingPlanRepository) {}

  execute(
    subjectId: string,
    classId: string,
    term: string,
  ): Promise<TeachingPlan | null> {
    return this.repo.getTeachingPlan(subjectId, classId, term);
  }
}
