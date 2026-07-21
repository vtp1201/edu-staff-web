import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../failures/parent-consent.failure";
import type {
  IParentConsentRepository,
  UpdateConsentInput,
} from "../repositories/i-parent-consent.repository";
import type { Result } from "./result";

/**
 * Persists a single toggle change (US-E20.2, INT-003). Thin passthrough — the
 * revert-on-failure decision is a presentation-layer optimistic-mutation
 * concern, not domain logic. The single `(studentId, category)` scope is
 * enforced by `UpdateConsentInput`'s shape (AC-004.2), not extra logic here.
 */
export class UpdateConsentUseCase {
  constructor(private readonly repo: IParentConsentRepository) {}

  execute(
    input: UpdateConsentInput,
  ): Promise<Result<ParentStudentConsent, ParentConsentFailure>> {
    return this.repo.updateConsent(input);
  }
}
