import type { GradeBook } from "../../domain/entities/grade-book.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";

export function isGradeBookFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

/**
 * Whether the resolved grade book is visible to a student / parent viewer. A
 * book is "published" when every row is PUBLISHED (read-only consumers must not
 * see drafts or pending-approval grades). Teacher/principal/admin always see
 * the roster, so the screen gates this only for student/parent roles.
 */
export function isGradeBookPublished(book: GradeBook | null): boolean {
  if (!book || book.rows.length === 0) return false;
  return book.rows.every((r) => r.publishStatus === "PUBLISHED");
}
