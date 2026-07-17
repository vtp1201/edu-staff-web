import type {
  LessonPlanPage,
  ListMyLessonPlansParams,
} from "../entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../repositories/i-lesson-plan.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";

export class ListMyLessonPlansUseCase {
  constructor(private readonly repo: ILessonPlanRepository) {}

  async execute(
    params: ListMyLessonPlansParams = {},
  ): Promise<Result<LessonPlanPage>> {
    try {
      return ok(await this.repo.listMine(params));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
