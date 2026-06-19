import type { GradeBook } from "../entities/grade-book.entity";

/**
 * Throwing repository (matches the IGradesRepository convention): success
 * returns the value, failures throw a {@link GradesFailure} object. The
 * use-case layer catches and maps to the failure union.
 */
export interface IGradeBookRepository {
  /** teacher / principal / admin — full class roster */
  getGradeBook(csId: string, term: string): Promise<GradeBook>;
  /** student — single row (the signed-in student) */
  getMyGrades(term: string): Promise<GradeBook>;
  /** parent — single row (the selected child) */
  getChildGrades(childId: string, term: string): Promise<GradeBook>;
}
