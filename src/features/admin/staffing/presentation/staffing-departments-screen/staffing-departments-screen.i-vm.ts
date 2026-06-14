import type {
  CreateDepartmentInput,
  Department,
  PatchDepartmentInput,
} from "../../domain/entities/department.entity";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";

export type DepartmentActionResult =
  | { ok: true; department: Department }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type VoidActionResult =
  | { ok: true }
  | { ok: false; errorKey: StaffingFailure["type"] };

export type DepartmentStatusFilter = "ALL" | "ACTIVE" | "ARCHIVED";

export interface StaffingDepartmentsScreenProps {
  initialDepartments: Department[];
  isAdmin: boolean;
  onCreateDepartment: (
    input: CreateDepartmentInput,
  ) => Promise<DepartmentActionResult>;
  onPatchDepartment: (
    id: string,
    input: PatchDepartmentInput,
  ) => Promise<DepartmentActionResult>;
  onArchiveDepartment: (id: string) => Promise<VoidActionResult>;
}
