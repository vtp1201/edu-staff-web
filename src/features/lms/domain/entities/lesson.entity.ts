/**
 * Lesson — `services/lms` `Lesson` / `LessonSummary` (openapi.yaml, US-E24.1).
 *
 * Content is a single plain-text body (max 50 000 runes). There is no video,
 * PDF, duration or per-student completion anywhere in the contract, so the
 * pre-US-E24.1 `LessonType`/`durationLabel`/`done` model is gone.
 */

/** Full lesson — `GET /courses/{courseId}/lessons/{lessonId}`. */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  position: number;
  /** Before this instant the lesson is hidden from students. Null = open now. */
  startAt: string | null;
  /** Advisory on a lesson — it stays readable, merely labelled CLOSED. */
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List row — `GET /courses/{courseId}/lessons`. Omits `content` BY DESIGN
 *  (keeps the hot "open a course" response bounded). */
export interface LessonSummary {
  id: string;
  courseId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}
