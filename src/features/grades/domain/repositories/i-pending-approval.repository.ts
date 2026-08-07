import type { PendingApprovalPage } from "../entities/pending-approval-batch.entity";

/**
 * Tenant-wide pending-approval DISCOVERY port (US-E18.46, BE US-186 —
 * `GET /api/v1/grade-entries/pending-approval`, gate `isAdminOrManager`).
 *
 * Its OWN port rather than a third method on {@link IGradeDecisionRepository},
 * for reasons the approve/reject pair does NOT satisfy:
 *
 * - **Addressing.** Every decision method is addressed by a
 *   `ClassSubjectTermKey` + cell; this read has no key at all — the tenant comes
 *   from the verified JWT claim and the endpoint is deliberately top-level, not
 *   nested under `/classes/{classId}/…`.
 * - **Construction.** The concrete per-cell repository is built per-key with a
 *   resolved assessment scheme + publish mode (two extra service reads). The
 *   rollup needs neither, so it gets its own tiny http-only implementation
 *   instead of being forced through a key-shaped factory with dummy arguments.
 * - **Kind.** A cursor-paginated read, not a mutation.
 *
 * Throwing repository (feature convention): success returns the page, failures
 * throw a `GradesFailure` (`invalid-cursor` for an undecodable cursor).
 */
export interface IPendingApprovalRepository {
  listPendingApprovalBatches(params?: {
    /** Opaque cursor from the previous page; omitted = first page. */
    cursor?: string;
    /** Page size. BE CLAMPS out-of-range values (`<=0` → 20, `>100` → 100). */
    limit?: number;
  }): Promise<PendingApprovalPage>;
}
