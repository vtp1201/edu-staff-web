import type { Lesson } from "../entities/lesson.entity";
import type {
  CreateLessonInput,
  ILmsRepository,
} from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** Append a lesson to a course. `content` is REQUIRED by BE (min 1 rune) —
 *  a lesson tile with no body is not a thing the contract allows. */
export class CreateLessonUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string, input: CreateLessonInput): Promise<Result<Lesson>> {
    return runCatching(() => this.repo.createLesson(courseId, input));
  }
}
