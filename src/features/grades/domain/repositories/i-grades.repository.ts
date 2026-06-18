import type {
  GradeSheet,
  StudentScoreRow,
} from "../entities/grade-sheet.entity";

/**
 * Throwing repository (decision: follows packet contract): success returns the
 * value, failures throw a {@link GradesFailure} object. The Server Action
 * boundary catches and maps `failure.type` → stable `errorKey`.
 */
export interface IGradesRepository {
  getGradeSheet(csId: string, term: string): Promise<GradeSheet>;
  saveScore(
    csId: string,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<StudentScoreRow>;
  publishGrades(csId: string, term: string): Promise<void>;
}
