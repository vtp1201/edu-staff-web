import type { LessonPlanEntity } from "../entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../repositories/i-lesson-plan.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";

export class PublishLessonPlanUseCase {
  constructor(private readonly repo: ILessonPlanRepository) {}

  async execute(id: string): Promise<Result<LessonPlanEntity>> {
    try {
      return ok(await this.repo.publish(id));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
