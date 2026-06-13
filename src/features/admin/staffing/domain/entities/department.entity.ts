export type DepartmentStatus = "ACTIVE" | "ARCHIVED";

export interface Department {
  id: string;
  name: string;
  conceptLabel: string | null;
  subjectParentIds: string[];
  status: DepartmentStatus;
  activeAssignmentCount: number;
}

export interface CreateDepartmentInput {
  name: string;
  conceptLabel: string | null;
  subjectParentIds: string[];
}

export type PatchDepartmentInput = Partial<CreateDepartmentInput>;
