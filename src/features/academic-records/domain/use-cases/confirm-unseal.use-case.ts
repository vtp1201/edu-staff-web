import type { UnsealRequest } from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Step 2 of the two-admin unseal flow (AC-8). When a co-signer is present the
 * domain enforces the two-admin gate BEFORE the repo call (defense-in-depth):
 *  - `no-pending-request`     — the target request no longer exists;
 *  - `same-admin-as-initiator`— the co-signer is the initiator (must differ).
 * `coSignerId === null` is the ADR-0037 single-admin self-approve fallback —
 * the same-admin check is skipped (self-approve is intentional) and the repo
 * flags `fallback: true`.
 */
export class ConfirmUnsealUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  async execute(
    requestId: string,
    coSignerId: string | null,
  ): Promise<SealResult<{ request: UnsealRequest; fallback: boolean }>> {
    if (coSignerId !== null) {
      const pending = await this.repo.getPendingUnsealRequests();
      if (!pending.ok) return pending;

      const target = pending.data.find((r) => r.id === requestId);
      if (!target) {
        return { ok: false, error: { type: "no-pending-request" } };
      }
      if (target.requestedById === coSignerId) {
        return { ok: false, error: { type: "same-admin-as-initiator" } };
      }
    }

    return this.repo.confirmUnseal(requestId, coSignerId);
  }
}
