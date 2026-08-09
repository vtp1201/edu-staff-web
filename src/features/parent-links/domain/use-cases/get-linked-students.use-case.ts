import type { LinkedStudentSummary } from "../entities/linked-student-summary.entity";
import type { ParentConsentFailure } from "../failures/parent-consent.failure";
import type { IParentConsentRepository } from "../repositories/i-parent-consent.repository";
import type { Result } from "./result";

/**
 * The parent's own linked children, WITHOUT their consent rows.
 *
 * Split out of `GetLinkedStudentsWithConsentsUseCase` because the children
 * overview never renders consents (it drops them), yet a failing consents read
 * took the whole screen down with it — which is exactly what happened live: the
 * links read succeeded while `GET /parent-student-links/consents` answered 405.
 * The consent section keeps using the combined use-case, where a consent
 * failure IS the story.
 */
export class GetLinkedStudentsUseCase {
  constructor(private readonly repo: IParentConsentRepository) {}

  execute(): Promise<Result<LinkedStudentSummary[], ParentConsentFailure>> {
    return this.repo.getLinkedStudents();
  }
}
