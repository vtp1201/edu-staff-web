import type { ScopeType } from "../../domain/entities/position-title.entity";

/** BE assignment status enum — `ARCHIVED` maps to the domain's `REVOKED`. */
export type AssignmentStatusDto = "ACTIVE" | "ARCHIVED";

/**
 * Wire shape of `PositionAssignmentResponse` (core/openapi.yaml). Note:
 * `positionAssignmentId` (not `id`), `scopeEntityType` present, `createdAt`
 * (mapped to the domain's `assignedAt`), and NO `memberName`/`positionTitleName`
 * (joined/fallback in the repository — see mapper + repository).
 */
export interface PositionAssignmentResponseDto {
  positionAssignmentId: string;
  tenantId: string;
  positionTitleId: string;
  memberId: string;
  scopeEntityType: ScopeType;
  scopeEntityId: string;
  academicYearId: string;
  status: AssignmentStatusDto;
  createdAt: string;
  updatedAt: string;
}
