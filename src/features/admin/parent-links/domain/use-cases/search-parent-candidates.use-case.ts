import type { LinkCandidate } from "../entities/link-candidate.entity";
import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type { IParentStudentLinkRepository } from "../repositories/i-parent-student-link.repository";
import type { Result } from "./result";

/**
 * Parent typeahead for the create-link dialog (INT-006). Restricted to
 * parent-role members of the admin's own tenant SERVER-SIDE (FR-010/NFR-008) —
 * the use-case delegates; it never client-filters a broader pool.
 */
export class SearchParentCandidatesUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    q: string,
  ): Promise<Result<LinkCandidate[], ParentStudentLinkFailure>> {
    return this.repo.searchParentCandidates(q);
  }
}
