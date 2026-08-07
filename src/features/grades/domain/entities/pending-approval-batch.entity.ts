/**
 * Tenant-wide "which grade batches are waiting on an approver" rollup
 * (US-E18.46, BE US-186 — `GET /api/v1/grade-entries/pending-approval`).
 *
 * ⚠️ This is a DISCOVERY shape, not a detail shape. The wire response carries
 * NO per-entry ids and NO `batchId` — the batch identity IS the
 * `(classId, subjectId, termId)` tuple, which is exactly the
 * {@link ClassSubjectTermKey} the approver screen already navigates by. Drilling
 * into a batch means loading the ordinary gradebook read for that tuple; there
 * is no "batch detail" endpoint.
 *
 * Deliberately NOT related to `GradeApprovalBatch` (the permanently-mocked
 * admin batch dashboard keyed by an invented `batchId` with no wire source,
 * ADR 0054 §2/§3). US-186 confirms that construct still does not exist.
 */
export interface PendingApprovalBatch {
  classId: string;
  subjectId: string;
  /** Term identifier as the gradebook routes use it (e.g. `HK1`). */
  termId: string;
  /** Grade entries in this batch currently sitting in `PENDING_APPROVAL`. */
  pendingCount: number;
  /**
   * ISO-8601 — the OLDEST outstanding submission in this batch (not the newest,
   * and not the batch's creation time): it is the batch's waiting-time, which is
   * also the tenant-wide sort key (oldest first = triage order).
   */
  submittedAt: string;
}

/** One cursor-paginated page of the rollup (`meta.pagination` on the wire). */
export interface PendingApprovalPage {
  items: PendingApprovalBatch[];
  /** null = no further page. */
  nextCursor: string | null;
  hasMore: boolean;
}
