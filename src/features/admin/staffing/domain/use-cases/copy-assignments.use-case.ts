import type {
  CopyAssignmentsInput,
  CopyAssignmentsResult,
} from "../entities/position-assignment.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import type { Result } from "./result";

export class CopyAssignmentsUseCase {
  constructor(private readonly repo: IStaffingRepository) {}

  async execute(
    input: CopyAssignmentsInput,
  ): Promise<Result<CopyAssignmentsResult, StaffingFailure>> {
    return this.repo.copyAssignments(input);
  }
}
