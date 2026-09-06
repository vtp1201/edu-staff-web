import type { ChildEntity } from "../entities/child.entity";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../entities/conduct-summary.entity";
import type {
  DecideLeaveInput,
  LeaveAttachmentEntity,
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
  SubmitLeaveRequestInput,
  SubmitMyLeaveRequestInput,
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
  deleteViolation(id: string): Promise<void>;
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
  /** Approve — GVCN of `input.classId` only (decision `0063`). */
  approveLeave(input: DecideLeaveInput): Promise<LeaveRequestEntity>;
  /** Reject with a mandatory reason — GVCN of `input.classId` only. */
  rejectLeave(
    input: DecideLeaveInput & { reason: string },
  ): Promise<LeaveRequestEntity>;

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

  // --- Attendance portal self-service, REAL wire (US-E24.6) ---

  /**
   * `POST /core/api/v1/conduct/student-leave-requests` — the real contract.
   * Separate from `submitLeaveRequest` (the legacy force-mocked shape) so a
   * future edit cannot silently repoint `/student/conduct` at the live wire.
   */
  submitMyLeaveRequest(
    input: SubmitMyLeaveRequestInput,
  ): Promise<LeaveRequestEntity>;

  /**
   * `GET /core/api/v1/conduct/student-leave-requests?studentMemberId=` — the
   * requests of ONE student, for annotating the absence history.
   *
   * A DISTINCT interface method rather than a reuse of `getMyLeaveRequests`
   * (whose implementation is a mock fixture read): keeping them separate is
   * what stops the two call paths being silently swapped for each other.
   */
  getLeaveRequestsForAttendance(
    studentMemberId: string,
  ): Promise<LeaveRequestEntity[]>;

  /**
   * `POST .../{requestId}/attachments?studentMemberId=` — multipart, ONE file
   * per call (core US-249; ≤3 files, ≤5MB, jpg/png/pdf, only while SUBMITTED).
   */
  uploadLeaveAttachment(
    requestId: string,
    studentMemberId: string,
    file: File,
  ): Promise<LeaveAttachmentEntity>;

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
