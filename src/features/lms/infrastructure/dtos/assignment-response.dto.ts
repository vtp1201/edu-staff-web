/** `services/lms` `Assignment` / `AssignmentSummary` — camelCase, 1:1 with openapi.yaml. */

export interface AssignmentResponseDto {
  id: string;
  classId: string;
  subjectId: string;
  courseId: string | null;
  title: string;
  instructions: string | null;
  startAt: string | null;
  dueAt: string | null;
  state: "UPCOMING_HIDDEN" | "OPEN" | "CLOSED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** List row — NO `instructions`, NO `createdAt`, and notably NO `state`. */
export interface AssignmentSummaryResponseDto {
  id: string;
  classId: string;
  subjectId: string;
  courseId: string | null;
  title: string;
  dueAt: string | null;
  createdBy: string;
  updatedAt: string;
}
