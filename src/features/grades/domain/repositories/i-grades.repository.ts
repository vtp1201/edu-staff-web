import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type {
  GradeSheet,
  StaffGradeCell,
} from "../entities/grade-sheet.entity";

/**
 * Throwing repository (decision: follows packet contract): success returns the
 * value, failures throw a {@link GradesFailure} object. The Server Action
 * boundary catches and maps `failure.type` → stable `errorKey`.
 *
 * Cells are {@link StaffGradeCell}s: this is the TEACHER/ADMIN entry contract,
 * so a write response may carry the staff-only rejection payload (US-E18.44 —
 * `core` does NOT clear it on resubmit). The student/parent read path uses the
 * narrower `GradeCell` via `IGradeBookRepository` and can never see it.
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
  ): Promise<{ studentId: string; columnId: string; cell: StaffGradeCell }>;
  submitScore(
    key: ClassSubjectTermKey,
    studentId: string,
    columnId: string,
  ): Promise<{ studentId: string; columnId: string; cell: StaffGradeCell }>;
}
