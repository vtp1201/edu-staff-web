import "server-only";
import type { AxiosInstance } from "axios";
import { STAFFING_EP } from "@/bootstrap/endpoint/staffing.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type {
  CreateDepartmentInput,
  Department,
  DepartmentStatus,
  PatchDepartmentInput,
} from "../../domain/entities/department.entity";
import type {
  AssignmentStatus,
  CopyAssignmentsInput,
  CopyAssignmentsResult,
  CreateAssignmentInput,
  PositionAssignment,
} from "../../domain/entities/position-assignment.entity";
import type {
  CreatePositionTitleInput,
  PatchPositionTitleInput,
  PositionTitle,
  PositionTitleStatus,
  ScopeType,
} from "../../domain/entities/position-title.entity";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";
import type { IStaffingRepository } from "../../domain/repositories/i-staffing.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { CopyAssignmentsResultDto } from "../dtos/copy-assignments-result.dto";
import type { DepartmentResponseDto } from "../dtos/department-response.dto";
import type { PositionAssignmentResponseDto } from "../dtos/position-assignment-response.dto";
import type { PositionTitleResponseDto } from "../dtos/position-title-response.dto";
import { StaffingMapper } from "../mappers/staffing.mapper";

/**
 * Map a normalised ApiError to the staffing failure union.
 * Branch on error.code (UPPER_SNAKE), never on message (US-E06.8).
 */
export function toFailure(err: unknown): StaffingFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // Network/transport error
  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }

  // already-exists (409)
  if (
    code === "DEPARTMENT_NAME_ALREADY_EXISTS" ||
    code === "POSITION_TITLE_NAME_ALREADY_EXISTS" ||
    code === "POSITION_ASSIGNMENT_ALREADY_EXISTS"
  ) {
    return { type: "already-exists" };
  }

  // has-active-assignments (409)
  if (
    code === "DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS" ||
    code === "POSITION_TITLE_HAS_ACTIVE_ASSIGNMENTS"
  ) {
    return { type: "has-active-assignments" };
  }

  // invalid-permissions (422)
  if (code === "POSITION_TITLE_INVALID_PERMISSIONS") {
    return { type: "invalid-permissions" };
  }

  // member-not-teacher (422)
  if (code === "MEMBER_NOT_TEACHER") {
    return { type: "member-not-teacher" };
  }

  // academic-year-not-active (422)
  if (code === "ACADEMIC_YEAR_NOT_ACTIVE") {
    return { type: "academic-year-not-active" };
  }

  // scope-entity-not-found (404)
  if (code === "SCOPE_ENTITY_NOT_FOUND") {
    return { type: "scope-entity-not-found" };
  }

  // forbidden (403)
  if (code === "POSITION_FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }

  // not-found (404)
  if (
    code === "DEPARTMENT_NOT_FOUND" ||
    code === "POSITION_TITLE_NOT_FOUND" ||
    code === "POSITION_ASSIGNMENT_NOT_FOUND" ||
    status === 404
  ) {
    return { type: "not-found" };
  }

  // Retryable errors (network-level, decision 0008)
  const isRetryable = (err as { retryable?: boolean })?.retryable;
  if (isRetryable) return { type: "network-error" };

  return { type: "unknown" };
}

export class StaffingRepository implements IStaffingRepository {
  constructor(private readonly http: AxiosInstance) {}

  // --- Departments ---

  async listDepartments(
    status?: DepartmentStatus,
  ): Promise<Result<Department[], StaffingFailure>> {
    try {
      const envelope = (await this.http.get(STAFFING_EP.departments, {
        params: { status, raw: true },
      })) as unknown as ApiEnvelope<DepartmentResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(StaffingMapper.toDepartment));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getDepartment(
    id: string,
  ): Promise<Result<Department, StaffingFailure>> {
    try {
      const data = (await this.http.get(
        STAFFING_EP.department(id),
      )) as unknown as DepartmentResponseDto;
      return ok(StaffingMapper.toDepartment(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createDepartment(
    input: CreateDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.departments,
        input,
      )) as unknown as DepartmentResponseDto;
      return ok(StaffingMapper.toDepartment(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchDepartment(
    id: string,
    input: PatchDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    try {
      const data = (await this.http.patch(
        STAFFING_EP.department(id),
        input,
      )) as unknown as DepartmentResponseDto;
      return ok(StaffingMapper.toDepartment(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archiveDepartment(id: string): Promise<Result<void, StaffingFailure>> {
    try {
      await this.http.post(STAFFING_EP.archiveDepartment(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  // --- Position Titles ---

  async listPositionTitles(filter?: {
    scopeType?: ScopeType;
    status?: PositionTitleStatus;
  }): Promise<Result<PositionTitle[], StaffingFailure>> {
    try {
      const envelope = (await this.http.get(STAFFING_EP.positionTitles, {
        params: { ...filter, raw: true },
      })) as unknown as ApiEnvelope<PositionTitleResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(StaffingMapper.toPositionTitle));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getPositionTitle(
    id: string,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    try {
      const data = (await this.http.get(
        STAFFING_EP.positionTitle(id),
      )) as unknown as PositionTitleResponseDto;
      return ok(StaffingMapper.toPositionTitle(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createPositionTitle(
    input: CreatePositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.positionTitles,
        input,
      )) as unknown as PositionTitleResponseDto;
      return ok(StaffingMapper.toPositionTitle(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchPositionTitle(
    id: string,
    input: PatchPositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    try {
      const data = (await this.http.patch(
        STAFFING_EP.positionTitle(id),
        input,
      )) as unknown as PositionTitleResponseDto;
      return ok(StaffingMapper.toPositionTitle(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archivePositionTitle(
    id: string,
  ): Promise<Result<void, StaffingFailure>> {
    try {
      await this.http.post(STAFFING_EP.archivePositionTitle(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  // --- Position Assignments ---

  async listAssignments(filter?: {
    memberId?: string;
    academicYearId?: string;
    status?: AssignmentStatus;
  }): Promise<Result<PositionAssignment[], StaffingFailure>> {
    try {
      const envelope = (await this.http.get(STAFFING_EP.positionAssignments, {
        params: { ...filter, raw: true },
      })) as unknown as ApiEnvelope<PositionAssignmentResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(StaffingMapper.toPositionAssignment));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getAssignment(
    id: string,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    try {
      const data = (await this.http.get(
        STAFFING_EP.positionAssignment(id),
      )) as unknown as PositionAssignmentResponseDto;
      return ok(StaffingMapper.toPositionAssignment(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createAssignment(
    input: CreateAssignmentInput,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.positionAssignments,
        input,
      )) as unknown as PositionAssignmentResponseDto;
      return ok(StaffingMapper.toPositionAssignment(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async revokeAssignment(id: string): Promise<Result<void, StaffingFailure>> {
    try {
      await this.http.post(STAFFING_EP.revokeAssignment(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async copyAssignments(
    input: CopyAssignmentsInput,
  ): Promise<Result<CopyAssignmentsResult, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.copyAssignments,
        input,
      )) as unknown as CopyAssignmentsResultDto;
      return ok(StaffingMapper.toCopyResult(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
