import type { ChildEntity } from "../entities/child.entity";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../entities/conduct-summary.entity";
import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
  SubmitLeaveRequestInput,
} from "../entities/leave-request.entity";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../entities/violation.entity";

/**
 * Discipline repository contract (US-E09.1). Implementations throw a
 * `DisciplineFailure` on error (mapped from the normalised ApiError by
 * error.code); use-cases / actions catch and surface a stable error key.
 * Wire fields are camelCase per the api-integration rule.
 */
export interface IDisciplineRepository {
  getViolations(params: {
    classId?: string;
    semester?: string;
  }): Promise<ViolationEntity[]>;
  recordViolation(input: RecordViolationInput): Promise<ViolationEntity>;
  getConductSummary(params: {
    classId?: string;
    semester?: string;
  }): Promise<ConductSummaryEntity[]>;
  overrideConductGrade(
    studentId: string,
    grade: ConductGrade,
    note: string,
  ): Promise<ConductSummaryEntity>;
  getLeaveRequests(params: { classId?: string }): Promise<LeaveRequestEntity[]>;
  approveLeave(id: string): Promise<LeaveRequestEntity>;
  rejectLeave(id: string, reason: string): Promise<LeaveRequestEntity>;

  // --- Student / parent self-service (US-E09.2) ---
  getMyConductSummary(
    studentId: string,
    semester?: string,
  ): Promise<ConductSummaryEntity>;
  getMyViolations(studentId: string): Promise<ViolationEntity[]>;
  getMyLeaveRequests(studentId: string): Promise<LeaveRequestEntity[]>;
  submitLeaveRequest(
    input: SubmitLeaveRequestInput,
  ): Promise<LeaveRequestEntity>;

  // --- Parent multi-child view (US-E09.4) ---
  getChildren(): Promise<ChildEntity[]>;
  getChildConductSummary(childId: string): Promise<ConductSummaryEntity>;
  getChildViolations(childId: string): Promise<ViolationEntity[]>;
  getChildLeaveRequests(childId: string): Promise<LeaveRequestEntity[]>;
  submitLeaveForChild(
    childId: string,
    input: SubmitChildLeaveRequestInput,
  ): Promise<LeaveRequestEntity>;
}
