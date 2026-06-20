import type {
  ChildSummary,
  GradeBook,
  GradeBookRole,
} from "../../domain/entities/grade-book.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { ClassSubjectOption } from "../grade-entry-screen/grade-entry-screen.i-vm";

export type { ClassSubjectOption };

export interface GradeBookScreenVM {
  role: GradeBookRole;
  /** for teacher / principal / admin selectors */
  classSubjects: ClassSubjectOption[];
  selectedCsId: string | null;
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
}
