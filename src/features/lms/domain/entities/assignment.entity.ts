import type { CourseTone } from "./course.entity";

/** Server-authoritative lifecycle status of an assignment. Overdue is a
 *  CLIENT-derived visual state (see `derive-overdue.ts`), never a server status. */
export type AssignmentStatus = "pending" | "submitted" | "graded";

/** Filter applied by the 4 tabs; `"all"` is the default (no filter). */
export type AssignmentStatusFilter = "all" | AssignmentStatus;

/**
 * A single assignment assigned to the student's own class(es). `tone` is the
 * pre-resolved design-system tone (the mapper resolves the DTO's raw hex —
 * the client never receives a hex). `teacherComment === ""` is a valid graded
 * value (empty-comment fallback copy); `null` means not graded yet.
 */
export interface AssignmentEntity {
  id: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  teacherName: string;
  /** Pre-resolved semantic tone for the icon box — never a raw hex. */
  tone: CourseTone;
  /** ISO deadline timestamp. */
  dueDate: string;
  status: AssignmentStatus;
  /** ISO — present once status !== "pending". */
  submittedAt: string | null;
  /** ISO — present once status === "graded". */
  gradedAt: string | null;
  score: number | null;
  maxScore: number | null;
  /** "" is a valid graded value (empty fallback); null = not graded yet. */
  teacherComment: string | null;
  /** Student's submitted attachment filename (metadata only, no bytes). */
  fileName: string | null;
  /** Student's submitted free-text answer. */
  answerText: string | null;
  /** Teacher's graded-file attachment (mock-download only). */
  gradedFileName: string | null;
}

/** Input for a submit action. `overdueConfirmed` records an explicitly-confirmed
 *  late submission (FR-006). File is metadata-only — no bytes (decision 0014). */
export interface SubmitAssignmentInput {
  answerText?: string;
  fileName?: string;
  overdueConfirmed: boolean;
}
