import type { Department } from "../../domain/entities/department.entity";
import type {
  CopyAssignmentsResult,
  PositionAssignment,
} from "../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import type { CopyAssignmentsResultDto } from "../dtos/copy-assignments-result.dto";
import type { DepartmentResponseDto } from "../dtos/department-response.dto";
import type { PositionAssignmentResponseDto } from "../dtos/position-assignment-response.dto";
import type { PositionTitleResponseDto } from "../dtos/position-title-response.dto";

export const StaffingMapper = {
  toDepartment(dto: DepartmentResponseDto): Department {
    return {
      id: dto.id,
      name: dto.name,
      conceptLabel: dto.conceptLabel,
      subjectParentIds: dto.subjectParentIds,
      status: dto.status,
      activeAssignmentCount: dto.activeAssignmentCount,
    };
  },

  toPositionTitle(dto: PositionTitleResponseDto): PositionTitle {
    return {
      id: dto.id,
      name: dto.name,
      scopeType: dto.scopeType,
      permissions: dto.permissions,
      status: dto.status,
      activeAssignmentCount: dto.activeAssignmentCount,
    };
  },

  toPositionAssignment(dto: PositionAssignmentResponseDto): PositionAssignment {
    return {
      id: dto.id,
      memberId: dto.memberId,
      memberName: dto.memberName,
      positionTitleId: dto.positionTitleId,
      positionTitleName: dto.positionTitleName,
      scopeEntityId: dto.scopeEntityId,
      academicYearId: dto.academicYearId,
      status: dto.status,
      assignedAt: dto.assignedAt,
    };
  },

  toCopyResult(dto: CopyAssignmentsResultDto): CopyAssignmentsResult {
    return {
      copiedCount: dto.copiedCount,
      skippedCount: dto.skippedCount,
    };
  },
};
