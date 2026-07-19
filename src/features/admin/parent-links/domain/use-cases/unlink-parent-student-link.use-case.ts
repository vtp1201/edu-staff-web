import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type {
  AuthContext,
  IParentStudentLinkRepository,
} from "../repositories/i-parent-student-link.repository";
import type { Result } from "./result";

/**
 * Unlink a parent-student link (US-E20.1, INT-003, HIGH-RISK). Pure delegate:
 * the row-visibility / no-optimistic-removal rule lives in the presentation
 * mutation (state-architecture §6.2), NOT here; the role/tenant re-auth
 * (AC-005.5) is enforced by the repository against `authCtx`.
 */
export class UnlinkParentStudentLinkUseCase {
  constructor(private readonly repo: IParentStudentLinkRepository) {}

  execute(
    linkId: string,
    authCtx: AuthContext,
  ): Promise<Result<void, ParentStudentLinkFailure>> {
    return this.repo.unlinkLink(linkId, authCtx);
  }
}
