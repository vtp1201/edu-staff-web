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

/** Fields every viewer of the staff grade sheet needs, regardless of role. */
interface GradeEntryScreenVMBase {
  classSubjects: ClassSubjectOption[];
  selectedClassId: string | null;
  selectedSubjectId: string | null;
  selectedTerm: string | null;
  /** null when no selection or while loading */
  sheet: GradeSheet | null;
  /** stable i18n error key, not translated copy */
  error: GradesFailure["type"] | null;
}

/**
 * TEACHER viewer (`/teacher/grades`) — enters and submits scores, and can NEVER
 * reject: `rejectEntryAction` is not merely optional here, it is absent from the
 * type, so a teacher-mode caller that tries to hand over a reject capability is
 * a COMPILE error rather than a runtime-only policy.
 */
export interface TeacherGradeEntryVM extends GradeEntryScreenVMBase {
  viewerRole: "teacher";
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

/**
 * APPROVER viewer — the ADMIN/MANAGER grade view mounted at
 * `/principal/grade-book` and `/admin/grade-book` (US-E18.44). VIEW + REJECT +
 * term-LOCK only: it has NO `saveScoreAction`/`submitScoresAction` at all, so
 * "an approver cannot edit a teacher's score" is enforced by the type system,
 * not by a boolean the screen might forget to check. Mirrors the
 * role-discriminated-VM convention used elsewhere in the repo (narrowed shapes
 * per role, not a bag of booleans).
 */
export interface ApproverGradeEntryVM extends GradeEntryScreenVMBase {
  viewerRole: "approver";
  /**
   * Reject / request-revision on ONE `PENDING_APPROVAL` cell
   * (`PENDING_APPROVAL → DRAFT` + a required reason ≤500 chars, BE US-184).
   * REQUIRED in approver mode — the only reason to mount this mode is to have
   * it. The Server Action re-checks the ADMIN/MANAGER role server-side; this VM
   * shape only decides whether the affordance is rendered at all.
   */
  rejectEntryAction: (
    studentId: string,
    columnId: string,
    reason: string,
  ) => Promise<ActionResult>;
  /**
   * Irreversible term lock (US-E18.12, ADR 0054 §4). Optional because it is
   * only bindable once a full class-subject-term is selected; absent ⇒ the
   * control is not rendered.
   */
  lockTermAction?: () => Promise<ActionResult & { lockedCount?: number }>;
  /**
   * Display labels for the current selection, resolved by the RSC page from the
   * class-subject picker options. `GradeSheet` carries ids only, and the lock
   * confirmation must name its target in words.
   */
  classLabel: string;
  subjectLabel: string;
}

export type GradeEntryScreenVM = TeacherGradeEntryVM | ApproverGradeEntryVM;

export type { SubmitScoresResult, SubmitTarget };
