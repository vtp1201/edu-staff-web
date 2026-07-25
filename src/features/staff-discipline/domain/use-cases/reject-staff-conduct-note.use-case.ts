import type { StaffConductNoteEntity } from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { StaffDisciplineFailure } from "../failures/staff-discipline.failure";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";
import { isRejectionReasonLongEnough } from "./is-rejection-reason-long-enough";

/**
 * INT-008 (reject) — SUBMITTED → REJECTED. Reuses the SAME shared client guard
 * as the violations reject use-case (no duplicated threshold logic).
 */
export class RejectStaffConductNoteUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  async execute(
    staffMemberId: string,
    termId: string,
    rejectionReason: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    if (!isRejectionReasonLongEnough(rejectionReason)) {
      const failure: StaffDisciplineFailure = { type: "missing-reject-reason" };
      throw failure;
    }
    return this.repo.rejectStaffConductNote(
      staffMemberId,
      termId,
      rejectionReason,
      authCtx,
    );
  }
}
