export type ScopeType = "SUBJECT_PARENT" | "DEPARTMENT";

/** Real BE `PositionPermission` enum (core/openapi.yaml). */
export type Permission =
  | "VIEW_SUBJECT_CONTENT"
  | "MANAGE_SUBJECT_CONTENT"
  | "VIEW_GRADE_DATA"
  | "APPROVE_LESSON_PLAN"
  | "VIEW_TEACHER_ASSIGNMENTS"
  | "MANAGE_TEACHER_ASSIGNMENTS";

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
