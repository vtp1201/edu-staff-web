import type { AssignmentStatus } from "../../domain/entities/position-assignment.entity";

export interface PositionAssignmentResponseDto {
  id: string;
  memberId: string;
  memberName: string;
  positionTitleId: string;
  positionTitleName: string;
  scopeEntityId: string | null;
  academicYearId: string;
  status: AssignmentStatus;
  assignedAt: string;
}
