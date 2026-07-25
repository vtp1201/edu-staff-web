import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import {
  type CreateStaffViolationInput,
  STAFF_VIOLATION_SEVERITIES,
  type StaffViolationEntity,
} from "../entities/staff-violation.entity";
import type { StaffDisciplineFailure } from "../failures/staff-discipline.failure";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/**
 * INT-001 — create a violation in DRAFT. Client-side defense-in-depth mirroring
 * the server's `VIOLATION_INVALID_INPUT` / `VIOLATION_INVALID_SEVERITY`; the
 * server remains authoritative (its failures simply propagate).
 */
export class CreateStaffViolationUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  async execute(
    input: CreateStaffViolationInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    if (!STAFF_VIOLATION_SEVERITIES.includes(input.severity)) {
      const failure: StaffDisciplineFailure = { type: "invalid-severity" };
      throw failure;
    }
    if (input.description.trim().length === 0) {
      const failure: StaffDisciplineFailure = {
        type: "validation",
        fields: [{ field: "description", reason: "required" }],
      };
      throw failure;
    }
    if (input.staffMemberId.trim().length === 0) {
      const failure: StaffDisciplineFailure = {
        type: "validation",
        fields: [{ field: "staffMemberId", reason: "required" }],
      };
      throw failure;
    }
    return this.repo.createStaffViolation(input, authCtx);
  }
}
