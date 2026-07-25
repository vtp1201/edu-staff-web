import type { StaffConductNoteEntity } from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type { IStaffDisciplineRepository } from "../repositories/i-staff-discipline.repository";

/** INT-006. Delegation only — `teacher` self-scope is server-enforced (NFR-008 pt. 3). */
export class ListStaffConductNotesUseCase {
  constructor(private readonly repo: IStaffDisciplineRepository) {}

  execute(
    params: { staffMemberId?: string; termId?: string },
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity[]> {
    return this.repo.listStaffConductNotes(params, authCtx);
  }
}
