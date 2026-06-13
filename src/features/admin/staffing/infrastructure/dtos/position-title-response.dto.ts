import type {
  Permission,
  PositionTitleStatus,
  ScopeType,
} from "../../domain/entities/position-title.entity";

export interface PositionTitleResponseDto {
  id: string;
  name: string;
  scopeType: ScopeType;
  permissions: Permission[];
  status: PositionTitleStatus;
  activeAssignmentCount: number;
}
