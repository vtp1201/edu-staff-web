import type {
  CreatePositionTitleInput,
  PositionTitle,
} from "../entities/position-title.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { fail, type Result } from "./result";

export class CreatePositionTitleUseCase {
  constructor(private readonly repo: IStaffingRepository) {}

  async execute(
    input: CreatePositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    // MANAGE_SUBJECT_CONTENT is only valid for SUBJECT_PARENT scope.
    if (
      input.permissions.includes("MANAGE_SUBJECT_CONTENT") &&
      input.scopeType !== "SUBJECT_PARENT"
    ) {
      return fail({ type: "invalid-permissions" });
    }
    return this.repo.createPositionTitle(input);
  }
}
