import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradeCell, GradeSheet } from "../entities/grade-sheet.entity";

/**
 * Throwing repository (decision: follows packet contract): success returns the
 * value, failures throw a {@link GradesFailure} object. The Server Action
 * boundary catches and maps `failure.type` → stable `errorKey`.
 *
 * US-E18.12 (ADR 0054) — remapped identity (`ClassSubjectTermKey`, not the
 * invented `csId`) + new `submitScore` (per-cell submit; no bulk endpoint
 * exists — `publishGrades` is REMOVED).
 */
export interface IGradesRepository {
  getGradeSheet(key: ClassSubjectTermKey): Promise<GradeSheet>;
  saveScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
    value: number,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }>;
  submitScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<{ studentId: string; columnId: string; cell: GradeCell }>;
}
