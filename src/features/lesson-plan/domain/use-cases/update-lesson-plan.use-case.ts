import type {
  LessonPlanEntity,
  UpdateLessonPlanInput,
} from "../entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../repositories/i-lesson-plan.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";
import { validateWriteInput } from "./validate-lesson-plan";

export class UpdateLessonPlanUseCase {
  constructor(private readonly repo: ILessonPlanRepository) {}

  async execute(
    id: string,
    input: UpdateLessonPlanInput,
  ): Promise<Result<LessonPlanEntity>> {
    const invalid = validateWriteInput(input);
    if (invalid) return fail(invalid);
    try {
      return ok(await this.repo.update(id, input));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
