import type { LessonQuestionEntity } from "../entities/lesson-question.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";

/** Lists a lesson's Q&A entries (newest first). */
export class ListQuestionsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(lessonId: string): Promise<LessonQuestionEntity[]> {
    return this.repo.listQuestions(lessonId);
  }
}
