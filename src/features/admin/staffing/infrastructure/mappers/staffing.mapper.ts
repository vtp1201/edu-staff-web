import type { Department } from "../../domain/entities/department.entity";
import type {
  AssignmentStatus,
  CopyAssignmentsResult,
  PositionAssignment,
} from "../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import type { CopyAssignmentsResultDto } from "../dtos/copy-assignments-result.dto";
import type { DepartmentResponseDto } from "../dtos/department-response.dto";
import type {
  AssignmentStatusDto,
  PositionAssignmentResponseDto,
} from "../dtos/position-assignment-response.dto";
import type { PositionTitleResponseDto } from "../dtos/position-title-response.dto";

/** Wire status (`ACTIVE|ARCHIVED`) → domain status (`ACTIVE|REVOKED`). */
function toAssignmentStatus(status: AssignmentStatusDto): AssignmentStatus {
  return status === "ARCHIVED" ? "REVOKED" : "ACTIVE";
}

export const StaffingMapper = {
  /**
   * @param activeAssignmentCount derived by the repository (not on the wire) —
   *   number of ACTIVE assignments scoped to this department.
   */
  toDepartment(
    dto: DepartmentResponseDto,
    activeAssignmentCount = 0,
  ): Department {
    return {
      id: dto.departmentId,
      name: dto.name,
      conceptLabelSuggested: dto.conceptLabelSuggested,
      conceptLabelCustom: dto.conceptLabelCustom,
      subjectParentIds: dto.subjectParentIds,
      status: dto.status,
      activeAssignmentCount,
    };
  },

  /**
   * @param activeAssignmentCount derived by the repository (not on the wire) —
   *   number of ACTIVE assignments referencing this title.
   */
  toPositionTitle(
    dto: PositionTitleResponseDto,
    activeAssignmentCount = 0,
  ): PositionTitle {
    return {
      id: dto.positionTitleId,
      name: dto.name,
      scopeType: dto.scopeType,
      permissions: dto.permissions,
      status: dto.status,
      activeAssignmentCount,
    };
  },

  /**
   * @param names joined display names. `positionTitleName` is looked up from the
   *   position-titles list; `memberName` has NO BE source (IAM MemberResponse has
   *   no name field) so callers fall back to the raw `memberId` — see repository.
   */
  toPositionAssignment(
    dto: PositionAssignmentResponseDto,
    names: { memberName: string; positionTitleName: string },
  ): PositionAssignment {
    return {
      id: dto.positionAssignmentId,
      memberId: dto.memberId,
      memberName: names.memberName,
      positionTitleId: dto.positionTitleId,
      positionTitleName: names.positionTitleName,
      scopeEntityId: dto.scopeEntityId,
      academicYearId: dto.academicYearId,
      status: toAssignmentStatus(dto.status),
      assignedAt: dto.createdAt,
    };
  },

  toCopyResult(dto: CopyAssignmentsResultDto): CopyAssignmentsResult {
    return {
      copiedCount: dto.copiedCount,
      skippedCount: dto.skippedCount,
    };
  },
};
