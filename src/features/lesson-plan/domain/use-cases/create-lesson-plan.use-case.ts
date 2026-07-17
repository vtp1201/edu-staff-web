import type {
  CreateLessonPlanInput,
  LessonPlanEntity,
} from "../entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../repositories/i-lesson-plan.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";
import { validateWriteInput } from "./validate-lesson-plan";

export class CreateLessonPlanUseCase {
  constructor(private readonly repo: ILessonPlanRepository) {}

  async execute(
    input: CreateLessonPlanInput,
  ): Promise<Result<LessonPlanEntity>> {
    const invalid = validateWriteInput(input);
    if (invalid) return fail(invalid);
    try {
      return ok(await this.repo.create(input));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
