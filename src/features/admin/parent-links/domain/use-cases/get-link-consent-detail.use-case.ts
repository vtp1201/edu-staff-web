import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type { IParentStudentLinkRepository } from "../repositories/i-parent-student-link.repository";
import type { Result } from "./result";

/** Read a link's 3 consent-category booleans for the detail dialog (INT-004). */
export class GetLinkConsentDetailUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    studentId: string,
    parentId: string,
  ): Promise<Result<ParentStudentConsent, ParentStudentLinkFailure>> {
    return this.repo.getLinkConsentDetail(studentId, parentId);
  }
}
