import type {
  Permission,
  PositionTitleStatus,
  ScopeType,
} from "../../domain/entities/position-title.entity";

/**
 * Wire shape of `PositionTitleResponse` (core/openapi.yaml). Note:
 * `positionTitleId` (not `id`), the 6-value `Permission` enum, and NO
 * `activeAssignmentCount` (derived by the repository from active assignments).
 */
export interface PositionTitleResponseDto {
  positionTitleId: string;
  tenantId: string;
  name: string;
  scopeType: ScopeType;
  permissions: Permission[];
  status: PositionTitleStatus;
  createdAt: string;
  updatedAt: string;
}
