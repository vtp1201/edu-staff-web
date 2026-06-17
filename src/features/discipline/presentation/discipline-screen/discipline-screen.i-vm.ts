import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../../domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "../../domain/entities/leave-request.entity";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";

export type DisciplineTab = "violations" | "conduct" | "leave";

export type DisciplineActionResult = { errorKey?: DisciplineFailure["type"] };

export interface DisciplineScreenVM {
  viewerRole: "teacher" | "principal";
  /** Teacher's assigned class; undefined for principal (sees all). */
  classId?: string;
  /** Available classes for the form/filter dropdowns. */
  availableClasses: string[];
  initialTab: DisciplineTab;
  initialSemester: string;

  violations: ViolationEntity[];
  conductSummary: ConductSummaryEntity[];
  leaveRequests: LeaveRequestEntity[];

  recordViolationAction: (
    input: RecordViolationInput,
  ) => Promise<DisciplineActionResult>;
  approveLeaveAction: (id: string) => Promise<DisciplineActionResult>;
  rejectLeaveAction: (
    id: string,
    reason: string,
  ) => Promise<DisciplineActionResult>;
  overrideConductGradeAction: (
    studentId: string,
    grade: ConductGrade,
    note: string,
  ) => Promise<DisciplineActionResult>;

  /** Initial async state — true while the RSC is streaming (skeleton). */
  isLoading?: boolean;
  /** Stable error key when the initial RSC fetch failed (error banner). */
  loadErrorKey?: DisciplineFailure["type"];
  /** Retry handler for the error banner (e.g. router.refresh). */
  onRetry?: () => void;

  /**
   * Optional callbacks to override tab/filter navigation (used by Storybook to
   * avoid Next.js router). In the app these default to searchParams nav.
   */
  onTabChange?: (tab: DisciplineTab) => void;
}
