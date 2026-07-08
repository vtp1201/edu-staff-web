import type { LessonQuestionEntity } from "../entities/lesson-question.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";

/** Appends a new question to a lesson's Q&A (prepended in the list). */
export class AskQuestionUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(lessonId: string, question: string): Promise<LessonQuestionEntity> {
    return this.repo.askQuestion(lessonId, question);
  }
}
