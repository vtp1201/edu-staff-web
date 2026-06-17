import type { ConductSummaryEntity } from "../../domain/entities/conduct-summary.entity";
import type {
  LeaveRequestEntity,
  SubmitLeaveRequestInput,
} from "../../domain/entities/leave-request.entity";
import type { ViolationEntity } from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";

/** Stable error key returned by the submit action; presentation translates it. */
export type StudentConductActionResult = {
  errorKey?: DisciplineFailure["type"];
};

/**
 * ViewModel for the student / parent conduct screen (US-E09.2). Data flows in as
 * props from the RSC; the submit action returns a stable failure key (never
 * translated copy), per the i18n boundary rule.
 */
export interface StudentConductScreenVM {
  viewerRole: "student" | "parent";
  /** Parent view: child's name shown in the header subtitle. */
  childName?: string;
  /** Parent view: child's class shown in the header subtitle. */
  childClass?: string;
  conductSummary: ConductSummaryEntity | null;
  violations: ViolationEntity[];
  leaveRequests: LeaveRequestEntity[];
  submitLeaveRequestAction: (
    input: SubmitLeaveRequestInput,
  ) => Promise<StudentConductActionResult>;
  isLoading?: boolean;
  loadErrorKey?: DisciplineFailure["type"];
  onRetry?: () => void;
}
