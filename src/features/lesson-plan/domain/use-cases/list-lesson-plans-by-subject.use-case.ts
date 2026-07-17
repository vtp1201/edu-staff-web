import type {
  LessonPlanPage,
  ListLessonPlansBySubjectParams,
} from "../entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../repositories/i-lesson-plan.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";

export class ListLessonPlansBySubjectUseCase {
  constructor(private readonly repo: ILessonPlanRepository) {}

  async execute(
    params: ListLessonPlansBySubjectParams,
  ): Promise<Result<LessonPlanPage>> {
    try {
      return ok(await this.repo.listBySubject(params));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
