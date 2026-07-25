import type { LinkAuditEntry } from "../entities/link-audit-entry.entity";
import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type { IParentStudentLinkRepository } from "../repositories/i-parent-student-link.repository";
import type { Result } from "./result";

/**
 * Read a link's append-only Create/Unlink history for the detail dialog
 * (US-E20.3, INT-102). Pure delegate — a missing linkId is `ok([])`, not a
 * failure (INT-105); no re-auth here (this is a read behind the already-gated
 * dialog, unlike the HIGH-RISK create/unlink mutations).
 */
export class GetLinkAuditTrailUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    linkId: string,
  ): Promise<Result<LinkAuditEntry[], ParentStudentLinkFailure>> {
    return this.repo.getLinkAuditTrail(linkId);
  }
}
