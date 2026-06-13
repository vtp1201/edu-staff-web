import type { PositionTitle } from "../entities/position-title.entity";
import type { StaffingFailure } from "../failures/staffing.failure";
import type { IStaffingRepository } from "../repositories/i-staffing.repository";
import { fail, type Result } from "./result";

export class ArchivePositionTitleUseCase {
  constructor(private readonly repo: IStaffingRepository) {}

  async execute(
    id: string,
    positionTitle: PositionTitle,
  ): Promise<Result<void, StaffingFailure>> {
    if (positionTitle.activeAssignmentCount > 0) {
      return fail({ type: "has-active-assignments" });
    }
    return this.repo.archivePositionTitle(id);
  }
}
