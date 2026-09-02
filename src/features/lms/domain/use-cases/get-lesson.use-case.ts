import type { Lesson } from "../entities/lesson.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** One lesson WITH its content (the list endpoint omits it by design). */
export class GetLessonUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string, lessonId: string): Promise<Result<Lesson>> {
    return runCatching(() => this.repo.getLesson(courseId, lessonId));
  }
}
