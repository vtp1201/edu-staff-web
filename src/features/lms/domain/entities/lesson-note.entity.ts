/** A student's personal note for a lesson (mock-local persistence, per lessonId). */
export interface LessonNoteEntity {
  lessonId: string;
  content: string;
  updatedAt: string; // ISO timestamp
}
