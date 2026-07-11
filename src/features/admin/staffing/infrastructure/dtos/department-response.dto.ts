import type {
  DepartmentConceptLabel,
  DepartmentStatus,
} from "../../domain/entities/department.entity";

/**
 * Wire shape of `DepartmentResponse` (core/openapi.yaml). Note: `departmentId`
 * (not `id`), the split `conceptLabelSuggested`/`conceptLabelCustom` fields, and
 * NO `activeAssignmentCount` (derived by the repository from active assignments).
 */
export interface DepartmentResponseDto {
  departmentId: string;
  tenantId: string;
  name: string;
  conceptLabelSuggested: DepartmentConceptLabel | null;
  conceptLabelCustom: string | null;
  subjectParentIds: string[];
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
}
