import type {
  CreateAssignmentInput,
  PositionAssignment,
} from "../entities/position-assignment.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { fail, type Result } from "./result";

export class AssignPositionUseCase {
  constructor(private readonly repo: IStaffingRepository) {}

  /**
   * `academicYearIsActive` is injected by the Server Action (not fetched inside
   * the use-case) to keep the domain pure. If the target academic year is not
   * active, the assignment is blocked before touching the repo.
   */
  async execute(
    input: CreateAssignmentInput,
    academicYearIsActive: boolean,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    if (!academicYearIsActive) {
      return fail({ type: "academic-year-not-active" });
    }
    return this.repo.createAssignment(input);
  }
}
