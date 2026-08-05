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
   * NOTE (US-E18.44): the admin/manager irreversible term lock (US-E18.12, ADR
   * 0054 §4) is deliberately NO LONGER part of this VM. Its only two routes —
   * `/principal/grade-book` and `/admin/grade-book` — moved onto the STAFF grade
   * sheet (`GradeEntryScreen`, `viewerRole: "approver"`) so that view can host
   * the per-cell reject affordance, and the lock control moved WITH them to
   * `presentation/components/lock-term-control.tsx` (moved, not copied —
   * decision 0026). This screen now serves teacher/student/parent reads, none of
   * which ever had a lock capability.
   */
}
