import type { LinkCandidate } from "../entities/link-candidate.entity";
import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type { IParentStudentLinkRepository } from "../repositories/i-parent-student-link.repository";
import type { Result } from "./result";

/** Student typeahead for the create-link dialog (INT-005), tenant-scoped server-side. */
export class SearchStudentCandidatesUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    q: string,
    classId?: string,
  ): Promise<Result<LinkCandidate[], ParentStudentLinkFailure>> {
    return this.repo.searchStudentCandidates(q, classId);
  }
}
