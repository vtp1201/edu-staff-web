import type { DepartmentStatus } from "../../domain/entities/department.entity";

export interface DepartmentResponseDto {
  id: string;
  name: string;
  conceptLabel: string | null;
  subjectParentIds: string[];
  status: DepartmentStatus;
  activeAssignmentCount: number;
}
