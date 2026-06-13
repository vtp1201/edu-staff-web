import type {
  CreateDepartmentInput,
  Department,
  DepartmentStatus,
  PatchDepartmentInput,
} from "../entities/department.entity";
import type {
  AssignmentStatus,
  CopyAssignmentsInput,
  CopyAssignmentsResult,
  CreateAssignmentInput,
  PositionAssignment,
} from "../entities/position-assignment.entity";
import type {
  CreatePositionTitleInput,
  PatchPositionTitleInput,
  PositionTitle,
  PositionTitleStatus,
  ScopeType,
} from "../entities/position-title.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { Result } from "../use-cases/result";

export interface IStaffingRepository {
  // Departments
  listDepartments(
    status?: DepartmentStatus,
  ): Promise<Result<Department[], StaffingFailure>>;
  getDepartment(id: string): Promise<Result<Department, StaffingFailure>>;
  createDepartment(
    input: CreateDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>>;
  patchDepartment(
    id: string,
    input: PatchDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>>;
  archiveDepartment(id: string): Promise<Result<void, StaffingFailure>>;

  // PositionTitles
  listPositionTitles(filter?: {
    scopeType?: ScopeType;
    status?: PositionTitleStatus;
  }): Promise<Result<PositionTitle[], StaffingFailure>>;
  getPositionTitle(id: string): Promise<Result<PositionTitle, StaffingFailure>>;
  createPositionTitle(
    input: CreatePositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>>;
  patchPositionTitle(
    id: string,
    input: PatchPositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>>;
  archivePositionTitle(id: string): Promise<Result<void, StaffingFailure>>;

  // PositionAssignments
  listAssignments(filter?: {
    memberId?: string;
    academicYearId?: string;
    status?: AssignmentStatus;
  }): Promise<Result<PositionAssignment[], StaffingFailure>>;
  getAssignment(
    id: string,
  ): Promise<Result<PositionAssignment, StaffingFailure>>;
  createAssignment(
    input: CreateAssignmentInput,
  ): Promise<Result<PositionAssignment, StaffingFailure>>;
  revokeAssignment(id: string): Promise<Result<void, StaffingFailure>>;
  copyAssignments(
    input: CopyAssignmentsInput,
  ): Promise<Result<CopyAssignmentsResult, StaffingFailure>>;
}
