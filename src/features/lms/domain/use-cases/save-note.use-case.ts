import type { LessonNoteEntity } from "../entities/lesson-note.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";

/** Upserts a lesson's note (mock-local persistence per lessonId). */
export class SaveNoteUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(lessonId: string, content: string): Promise<LessonNoteEntity> {
    return this.repo.saveNote(lessonId, content);
  }
}
