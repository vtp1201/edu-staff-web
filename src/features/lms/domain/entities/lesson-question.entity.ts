/** A Q&A entry for a lesson (mock-local). `answer` null = not yet answered. */
export interface LessonQuestionEntity {
  id: string;
  lessonId: string;
  question: string;
  answer: string | null;
  askedAt: string; // ISO timestamp
}
