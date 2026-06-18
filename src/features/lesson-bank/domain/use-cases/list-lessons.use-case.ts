import type { LessonEntity, LessonListFilter } from "../entities/lesson.entity";
import type { ILessonBankRepository } from "../repositories/i-lesson-bank.repository";

export class ListLessonsUseCase {
  constructor(private readonly repo: ILessonBankRepository) {}

  execute(filter: LessonListFilter = {}): Promise<LessonEntity[]> {
    return this.repo.listLessons(filter);
  }
}
