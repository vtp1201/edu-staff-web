import type { ChildEntity } from "../../domain/entities/child.entity";
import type { ConductSummaryEntity } from "../../domain/entities/conduct-summary.entity";
import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
} from "../../domain/entities/leave-request.entity";
import type { ViolationEntity } from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";

/** Result of a child-scoped read action (stable error key; presentation translates). */
export type ChildConductResult = {
  data?: ConductSummaryEntity;
  errorKey?: DisciplineFailure["type"];
};
export type ChildViolationsResult = {
  data?: ViolationEntity[];
  errorKey?: DisciplineFailure["type"];
};
export type ChildLeaveResult = {
  data?: LeaveRequestEntity[];
  errorKey?: DisciplineFailure["type"];
};

/**
 * ViewModel for the parent multi-child discipline screen (US-E09.4). The RSC
 * prefetches the first child's data; switching children calls the read actions
 * passed in as props. All actions return stable failure keys (never translated
 * copy), per the i18n boundary rule. parentId/submittedBy are NEVER part of the
 * input — the server derives them from the session.
 */
export interface ParentDisciplineScreenVM {
  childList: ChildEntity[];
  /** First child in the list (default selection). */
  initialChildId: string;
  initialConduct: ConductSummaryEntity | null;
  initialViolations: ViolationEntity[];
  initialLeaveRequests: LeaveRequestEntity[];
  loadErrorKey?: DisciplineFailure["type"];
  submitChildLeaveRequestAction: (
    childId: string,
    input: SubmitChildLeaveRequestInput,
  ) => Promise<{ errorKey?: DisciplineFailure["type"] }>;
  getChildConductAction: (childId: string) => Promise<ChildConductResult>;
  getChildViolationsAction: (childId: string) => Promise<ChildViolationsResult>;
  getChildLeaveRequestsAction: (childId: string) => Promise<ChildLeaveResult>;
  /** Storybook-only: force the loading skeleton. */
  isLoading?: boolean;
}
