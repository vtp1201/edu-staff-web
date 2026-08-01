import type { UnsealApproveResult } from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Bound for the two-admin-gate pre-check listing (US-E18.24, fe-lead
 * resolution #1). ONE page, no cursor-follow: this local lookup is a UX nicety,
 * not the source of truth — approve is server-authoritative and idempotent-safe
 * whether or not the client saw the whole backlog.
 */
export const UNSEAL_PRECHECK_PAGE_LIMIT = 100;

/**
 * Step 2 of the two-admin unseal flow (AC-8). When a co-signer is present the
 * domain enforces the two-admin gate BEFORE the repo call (defense-in-depth):
 *  - `no-pending-request`     — the target request no longer exists;
 *  - `same-admin-as-initiator`— the co-signer is the initiator (must differ).
 * `coSignerId === null` is the ADR-0037 single-admin self-approve fallback. It is
 * ONLY permitted when the tenant genuinely has exactly one admin — the domain
 * re-verifies the admin count server-side (defense-in-depth against a client that
 * renders a self-approve affordance it shouldn't) and rejects with
 * `self-approve-not-allowed` otherwise.
 *
 * US-E18.24: `classId`/`termId` are required because the pending listing is now
 * class+term-scoped on the wire. The result is the real
 * `ApproveUnsealResponse`-shaped {@link UnsealApproveResult} (carries
 * `selfApproved`, which replaces the old mock-only `fallback` flag).
 */
export class ConfirmUnsealUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  async execute(
    requestId: string,
    coSignerId: string | null,
    classId: string,
    termId: string,
  ): Promise<SealResult<UnsealApproveResult>> {
    if (coSignerId !== null) {
      const pending = await this.repo.getPendingUnsealRequests(
        classId,
        termId,
        { status: "PENDING", limit: UNSEAL_PRECHECK_PAGE_LIMIT },
      );
      if (!pending.ok) return pending;

      const target = pending.data.items.find((r) => r.requestId === requestId);
      if (!target) {
        return { ok: false, error: { type: "no-pending-request" } };
      }
      if (target.requestedBy === coSignerId) {
        return { ok: false, error: { type: "same-admin-as-initiator" } };
      }
    } else {
      // Self-approve fallback — only legitimate in a single-admin tenant. Verify
      // server-side so a tampered client cannot bypass the two-admin gate.
      const admins = await this.repo.listTenantAdmins();
      if (!admins.ok) return admins;
      if (admins.data.length !== 1) {
        return { ok: false, error: { type: "self-approve-not-allowed" } };
      }
    }

    return this.repo.confirmUnseal(requestId, coSignerId, classId, termId);
  }
}
