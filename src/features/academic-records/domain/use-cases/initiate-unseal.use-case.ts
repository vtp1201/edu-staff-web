import type {
  InitiateUnsealInput,
  UnsealRequest,
} from "../entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../repositories/i-academic-records-seal.repository";

/**
 * Binding unseal-reason minimum (AC-7 + ADR-0037 Amendment 2026-07-05).
 * NOTE: 20 — NOT the "10" in ADR-0037 Decision-1 draft prose.
 */
export const MIN_UNSEAL_REASON_LENGTH = 20;

/**
 * Step 1 of the two-admin unseal flow (AC-7): validate the reason locally, then
 * delegate. The repo separately enforces the target is actually SEALED
 * (`not-sealed`), kept as defense-in-depth for the mock-first + future-BE path.
 */
export class InitiateUnsealUseCase {
  constructor(private readonly repo: IAcademicRecordsSealRepository) {}

  async execute(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealRequest>> {
    if (input.reason.trim().length < MIN_UNSEAL_REASON_LENGTH) {
      return { ok: false, error: { type: "reason-too-short" } };
    }
    return this.repo.initiateUnseal(input);
  }
}
