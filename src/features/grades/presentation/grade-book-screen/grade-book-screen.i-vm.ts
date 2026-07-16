import type {
  ChildSummary,
  GradeBook,
  GradeBookRole,
} from "../../domain/entities/grade-book.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type {
  ActionResult,
  ClassSubjectOption,
} from "../grade-entry-screen/grade-entry-screen.i-vm";

export type { ClassSubjectOption };

export interface GradeBookScreenVM {
  role: GradeBookRole;
  /** for teacher / principal / admin selectors */
  classSubjects: ClassSubjectOption[];
  selectedClassId: string | null;
  selectedSubjectId: string | null;
  selectedTerm: string | null;
  gradeBook: GradeBook | null;
  /** whether grades are visible to the viewer (student / parent gate) */
  isPublished: boolean;
  /** stable i18n error key, not translated copy */
  error: GradesFailure["type"] | null;
  /** teacher only — grade-entry route to navigate to via the CTA */
  gradeEntryPath?: string;
  /** parent role only — list of linked children; undefined for other roles */
  childrenList?: ChildSummary[];
  /** parent role only — currently active child id; undefined for other roles */
  activeChildId?: string;
  /**
   * NEW (US-E18.12, ADR 0054 §4) — admin/manager only (irreversible term
   * lock). Undefined for teacher/student/parent — the screen gates the lock
   * button's render on this being present, not just on `vm.role`, so the
   * container/DI layer is the single source of truth for whether the actor is
   * actually authorized (belt-and-suspenders with the BE's own 403 gate).
   */
  lockTermAction?: () => Promise<ActionResult & { lockedCount?: number }>;
}
