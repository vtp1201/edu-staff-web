/**
 * Raw wire shape of a student assignment (camelCase, per api-integration.md).
 * `courseColor` is a raw hex — the mapper resolves it to a design-system tone.
 * Logical/mock-first: `lms` has no real `openapi.yaml` yet (decision 0014), so
 * this shape is derived from requirements.md + design-spec, to be reconciled
 * when a real `lms` contract ships (integration.md §5 open question).
 */
export interface AssignmentDto {
  id: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  teacherName: string;
  /** Raw accent hex; mapper resolves → CourseTone. */
  courseColor: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded";
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  maxScore: number | null;
  teacherComment: string | null;
  fileName: string | null;
  answerText: string | null;
  gradedFileName: string | null;
}

/** List envelope payload (after interceptor unwrap). */
export interface AssignmentsListDto {
  assignments: AssignmentDto[];
}
