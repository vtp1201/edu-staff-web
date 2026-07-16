import type { GradeSheet } from "../../domain/entities/grade-sheet.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type {
  SubmitScoresResult,
  SubmitTarget,
} from "../../domain/use-cases/submit-column-scores.use-case";

/** Composed real tuple (US-E18.12, ADR 0054 §5) — no more invented `csId`. */
export interface ClassSubjectOption {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: GradesFailure["type"] };

export type SubmitActionResult =
  | { ok: true; result: SubmitScoresResult }
  | { ok: false; errorKey: GradesFailure["type"] };

export interface GradeEntryScreenVM {
  classSubjects: ClassSubjectOption[];
  selectedClassId: string | null;
  selectedSubjectId: string | null;
  selectedTerm: string | null;
  /** null when no selection or while loading */
  sheet: GradeSheet | null;
  /** stable i18n error key, not translated copy */
  error: GradesFailure["type"] | null;
  /**
   * The RSC page binds the current `ClassSubjectTermKey` into this Server
   * Action (`.bind(null, key)`) before passing it down — the screen only ever
   * supplies the per-cell target, never re-threads identity it didn't select.
   */
  saveScoreAction: (
    studentId: string,
    columnId: string,
    value: number,
  ) => Promise<ActionResult>;
  /**
   * Fans out `submit` over the given targets (1 target = "submit this cell",
   * the row's DRAFT cells = "submit this row", every DRAFT cell in view =
   * "submit all drafts") — screen-level orchestration picks the target set,
   * the DI-wired Server Action does the fan-out (US-E18.12, ADR 0054 §2.2).
   */
  submitScoresAction: (targets: SubmitTarget[]) => Promise<SubmitActionResult>;
}

export type { SubmitScoresResult, SubmitTarget };
