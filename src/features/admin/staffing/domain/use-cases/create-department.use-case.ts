import type {
  CreateDepartmentInput,
  Department,
} from "../entities/department.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import type { Result } from "./result";

export class CreateDepartmentUseCase {
  constructor(private readonly repo: IStaffingRepository) {}

  async execute(
    input: CreateDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    return this.repo.createDepartment(input);
  }
}
