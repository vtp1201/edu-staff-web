import type {
  CopyAssignmentsInput,
  CopyAssignmentsResult,
  CreateAssignmentInput,
  PositionAssignment,
} from "../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";

export type AssignmentActionResult =
  | { ok: true; assignment: PositionAssignment }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type CopyActionResult =
  | { ok: true; result: CopyAssignmentsResult }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type VoidActionResult =
  | { ok: true }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type AssignmentStatusFilter = "ALL" | "ACTIVE" | "REVOKED";

export interface StaffingAssignmentsScreenProps {
  initialAssignments: PositionAssignment[];
  /** ACTIVE position titles available for assigning. */
  positionTitles: PositionTitle[];
  isAdmin: boolean;
  onAssignPosition: (
    input: CreateAssignmentInput,
  ) => Promise<AssignmentActionResult>;
  onRevokeAssignment: (id: string) => Promise<VoidActionResult>;
  onCopyAssignments: (input: CopyAssignmentsInput) => Promise<CopyActionResult>;
}
