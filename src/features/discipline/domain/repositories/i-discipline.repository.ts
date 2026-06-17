import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "../entities/leave-request.entity";
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
}
