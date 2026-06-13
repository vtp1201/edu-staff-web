import type { Department } from "../entities/department.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { fail, type Result } from "./result";

export class ArchiveDepartmentUseCase {
  constructor(private readonly repo: IStaffingRepository) {}

  async execute(
    id: string,
    department: Department,
  ): Promise<Result<void, StaffingFailure>> {
    if (department.activeAssignmentCount > 0) {
      return fail({ type: "has-active-assignments" });
    }
    return this.repo.archiveDepartment(id);
  }
}
