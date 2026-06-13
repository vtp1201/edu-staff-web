export type ScopeType = "SUBJECT_PARENT" | "DEPARTMENT";

export type Permission =
  | "MANAGE_SUBJECT_CONTENT"
  | "MANAGE_SCHEDULE"
  | "MANAGE_CONDUCT"
  | "VIEW_REPORTS";

export type PositionTitleStatus = "ACTIVE" | "ARCHIVED";

export interface PositionTitle {
  id: string;
  name: string;
  scopeType: ScopeType;
  permissions: Permission[];
  status: PositionTitleStatus;
  activeAssignmentCount: number;
}

export interface CreatePositionTitleInput {
  name: string;
  scopeType: ScopeType;
  permissions: Permission[];
}

export type PatchPositionTitleInput = { permissions: Permission[] };
