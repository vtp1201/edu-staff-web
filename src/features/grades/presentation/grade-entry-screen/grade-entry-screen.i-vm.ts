import type { GradeSheet } from "../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";

export interface ClassSubjectOption {
  id: string; // csId
  label: string; // e.g. "10A1 — Toán"
}

export type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: GradesFailure["type"] };

export interface GradeEntryScreenVM {
  classSubjects: ClassSubjectOption[];
  selectedCsId: string | null;
  selectedTerm: string | null;
  /** null when no selection or while loading */
  sheet: GradeSheet | null;
  /** stable i18n error key, not translated copy */
  error: GradesFailure["type"] | null;
  saveScoreAction: (
    csId: string,
    studentId: string,
    columnId: string,
    value: number,
  ) => Promise<ActionResult>;
  publishAction: (csId: string, term: string) => Promise<ActionResult>;
}
