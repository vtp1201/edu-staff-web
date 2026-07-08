import type { LessonNoteEntity } from "../entities/lesson-note.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";

/** Reads a lesson's saved note (null if none). */
export class GetNoteUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(lessonId: string): Promise<LessonNoteEntity | null> {
    return this.repo.getNote(lessonId);
  }
}
