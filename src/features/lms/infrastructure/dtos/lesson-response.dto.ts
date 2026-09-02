/** `services/lms` `Lesson` / `LessonSummary` — camelCase, 1:1 with openapi.yaml. */

export interface LessonResponseDto {
  id: string;
  courseId: string;
  title: string;
  content: string;
  position: number;
  startAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List row — NO `content` (bounded-response rule, BE VULN-139-001). */
export interface LessonSummaryResponseDto {
  id: string;
  courseId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}
