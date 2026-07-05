import "server-only";
import type { AxiosInstance } from "axios";
import { DISCIPLINE_EP } from "@/bootstrap/endpoint/discipline.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { ChildEntity } from "../../domain/entities/child.entity";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../../domain/entities/conduct-summary.entity";
import type {
  LeaveRequestEntity,
  SubmitChildLeaveRequestInput,
  SubmitLeaveRequestInput,
} from "../../domain/entities/leave-request.entity";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";
import type { IDisciplineRepository } from "../../domain/repositories/i-discipline.repository";
import type { ConductResponseDto } from "../dtos/conduct-response.dto";
import type { LeaveRequestResponseDto } from "../dtos/leave-request-response.dto";
import type { ViolationResponseDto } from "../dtos/violation-response.dto";
import { DisciplineMapper } from "../mappers/discipline.mapper";

/**
 * Map a normalised ApiError to the discipline failure union (US-E09.1).
 * Branch on error.code (UPPER_SNAKE) / status, never on message.
 */
export function toFailure(err: unknown): DisciplineFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "STUDENT_NOT_FOUND" || code === "MISSING_STUDENT") {
    return { type: "missing-student" };
  }
  if (code === "MISSING_DESCRIPTION") {
    return { type: "missing-description" };
  }
  if (code === "MISSING_REJECT_REASON") {
    return { type: "missing-reject-reason" };
  }
  if (
    code === "LEAVE_ALREADY_DECIDED" ||
    code === "ALREADY_PROCESSED" ||
    status === 409
  ) {
    return { type: "already-processed" };
  }
  if (code === "INVALID_SEVERITY") {
    return { type: "invalid-severity" };
  }
  if (code === "INVALID_CONDUCT_GRADE") {
    return { type: "invalid-conduct-grade" };
  }
  if (code === "FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }
  if (code === "CHILD_NOT_FOUND" || code === "NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "INVALID_CHILD") {
    return { type: "invalid-child" };
  }
  if (code === "CONFLICT") {
    return { type: "conflict" };
  }
  return { type: "network-error" };
}

export class DisciplineRepository implements IDisciplineRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getViolations(params: {
    classId?: string;
    semester?: string;
  }): Promise<ViolationEntity[]> {
    try {
      const dtos = (await this.http.get(DISCIPLINE_EP.violations, {
        params,
      })) as unknown as ViolationResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toViolation);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async recordViolation(input: RecordViolationInput): Promise<ViolationEntity> {
    try {
      const dto = (await this.http.post(
        DISCIPLINE_EP.recordViolation,
        input,
      )) as unknown as ViolationResponseDto;
      return DisciplineMapper.toViolation(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async deleteViolation(id: string): Promise<void> {
    try {
      await this.http.delete(DISCIPLINE_EP.deleteViolation(id));
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getConductSummary(params: {
    classId?: string;
    semester?: string;
  }): Promise<ConductSummaryEntity[]> {
    try {
      const dtos = (await this.http.get(DISCIPLINE_EP.conduct, {
        params,
      })) as unknown as ConductResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toConductSummary);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async overrideConductGrade(
    studentId: string,
    grade: ConductGrade,
    note: string,
  ): Promise<ConductSummaryEntity> {
    try {
      const dto = (await this.http.put(
        DISCIPLINE_EP.overrideConduct(studentId),
        {
          grade,
          note,
        },
      )) as unknown as ConductResponseDto;
      return DisciplineMapper.toConductSummary(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getLeaveRequests(params: {
    classId?: string;
  }): Promise<LeaveRequestEntity[]> {
    try {
      const dtos = (await this.http.get(DISCIPLINE_EP.leaveRequests, {
        params,
      })) as unknown as LeaveRequestResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toLeaveRequest);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async approveLeave(id: string): Promise<LeaveRequestEntity> {
    try {
      const dto = (await this.http.put(
        DISCIPLINE_EP.approveLeave(id),
      )) as unknown as LeaveRequestResponseDto;
      return DisciplineMapper.toLeaveRequest(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async rejectLeave(id: string, reason: string): Promise<LeaveRequestEntity> {
    try {
      const dto = (await this.http.put(DISCIPLINE_EP.rejectLeave(id), {
        reason,
      })) as unknown as LeaveRequestResponseDto;
      return DisciplineMapper.toLeaveRequest(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  // --- Student / parent self-service (US-E09.2) ---

  async getMyConductSummary(
    studentId: string,
    semester?: string,
  ): Promise<ConductSummaryEntity> {
    try {
      const dto = (await this.http.get(DISCIPLINE_EP.myConduct, {
        params: { studentId, semester },
      })) as unknown as ConductResponseDto;
      return DisciplineMapper.toConductSummary(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getMyViolations(studentId: string): Promise<ViolationEntity[]> {
    try {
      const dtos = (await this.http.get(DISCIPLINE_EP.myViolations, {
        params: { studentId },
      })) as unknown as ViolationResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toViolation);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getMyLeaveRequests(studentId: string): Promise<LeaveRequestEntity[]> {
    try {
      const dtos = (await this.http.get(DISCIPLINE_EP.myLeaveRequests, {
        params: { studentId },
      })) as unknown as LeaveRequestResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toLeaveRequest);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async submitLeaveRequest(
    input: SubmitLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    try {
      const dto = (await this.http.post(
        DISCIPLINE_EP.submitLeaveRequest,
        input,
      )) as unknown as LeaveRequestResponseDto;
      return DisciplineMapper.toLeaveRequest(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  // --- Parent multi-child view (US-E09.4) ---
  // Mock-first: the real `core` parent↔child + child-scoped discipline endpoints
  // are not shipped yet (decision 0014/0017). These call the documented routes;
  // until the service exists DI selects the mock repo. The wire shape (camelCase
  // ChildEntity / ConductResponseDto / etc.) is reconciled when core ships.

  async getChildren(): Promise<ChildEntity[]> {
    try {
      const dtos = (await this.http.get(
        DISCIPLINE_EP.parentChildren,
      )) as unknown as ChildEntity[];
      return dtos ?? [];
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getChildConductSummary(childId: string): Promise<ConductSummaryEntity> {
    try {
      const dto = (await this.http.get(
        DISCIPLINE_EP.childConductSummary(childId),
      )) as unknown as ConductResponseDto;
      return DisciplineMapper.toConductSummary(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getChildViolations(childId: string): Promise<ViolationEntity[]> {
    try {
      const dtos = (await this.http.get(
        DISCIPLINE_EP.childViolations(childId),
      )) as unknown as ViolationResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toViolation);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async getChildLeaveRequests(childId: string): Promise<LeaveRequestEntity[]> {
    try {
      const dtos = (await this.http.get(
        DISCIPLINE_EP.childLeaveRequests(childId),
      )) as unknown as LeaveRequestResponseDto[];
      return (dtos ?? []).map(DisciplineMapper.toLeaveRequest);
    } catch (err) {
      throw toFailure(err);
    }
  }

  async submitLeaveForChild(
    childId: string,
    input: SubmitChildLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    try {
      const dto = (await this.http.post(
        DISCIPLINE_EP.submitChildLeaveRequest(childId),
        input,
      )) as unknown as LeaveRequestResponseDto;
      return DisciplineMapper.toLeaveRequest(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }
}
