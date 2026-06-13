export type AssignmentStatus = "ACTIVE" | "REVOKED";

export interface PositionAssignment {
  id: string;
  memberId: string;
  memberName: string;
  positionTitleId: string;
  positionTitleName: string;
  scopeEntityId: string | null;
  academicYearId: string;
  status: AssignmentStatus;
  assignedAt: string; // ISO string
}

export interface CreateAssignmentInput {
  memberId: string;
  positionTitleId: string;
  scopeEntityId: string | null;
  academicYearId: string;
}

export interface CopyAssignmentsInput {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
}

export interface CopyAssignmentsResult {
  copiedCount: number;
  skippedCount: number;
}
