import type { LessonEntity } from "../entities/lesson.entity";
import type { ILessonBankRepository } from "../repositories/i-lesson-bank.repository";

export class GetLessonDetailUseCase {
  constructor(private readonly repo: ILessonBankRepository) {}

  execute(id: string): Promise<LessonEntity> {
    return this.repo.getLessonDetail(id);
  }
}
