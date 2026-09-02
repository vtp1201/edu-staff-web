/**
 * `services/lms` `CourseItem` — camelCase, 1:1 with openapi.yaml (ADR 0143).
 * The four exam fields are FLAT on the wire; the mapper nests them.
 */
export interface CourseItemResponseDto {
  id: string;
  courseId: string;
  itemType: "LESSON" | "ASSIGNMENT" | "DOCUMENT" | "EXAM";
  refId: string | null;
  title: string;
  description: string | null;
  url: string | null;
  position: number;
  startAt: string | null;
  dueAt: string | null;
  state: "UPCOMING_HIDDEN" | "OPEN" | "CLOSED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  examId: string | null;
  scheduledDate: string | null;
  durationMinutes: number | null;
  examUrl: string | null;
}
