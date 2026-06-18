import type { LessonEntity, LessonListFilter } from "../entities/lesson.entity";
import type { UploadLessonInput } from "../entities/upload-lesson-input.entity";

export interface ILessonBankRepository {
  listLessons(filter: LessonListFilter): Promise<LessonEntity[]>;
  getLessonDetail(id: string): Promise<LessonEntity>;
  uploadLesson(input: UploadLessonInput): Promise<LessonEntity>;
  updateLesson(
    id: string,
    input: Partial<UploadLessonInput>,
  ): Promise<LessonEntity>;
  deleteLesson(id: string): Promise<void>;
}
