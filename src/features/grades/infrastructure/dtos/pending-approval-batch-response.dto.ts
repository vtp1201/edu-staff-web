/**
 * `GET /api/v1/grade-entries/pending-approval` (US-E18.46, BE US-186).
 * Ground-truthed against `core/docs/openapi.yaml`
 * (`PendingApprovalBatchResponse` / `PendingApprovalBatchListData`, ~L9472).
 * camelCase wire fields; every listed field is REQUIRED on the wire.
 *
 * Pagination is NOT in `data` — it arrives in `meta.pagination`
 * (`nextCursor`/`hasMore`), so the repository reads this endpoint with
 * `{ raw: true }` + `parseEnvelope`.
 */
export interface PendingApprovalBatchResponseDto {
  classId: string;
  subjectId: string;
  termId: string;
  /** Entries in this batch currently PENDING_APPROVAL. */
  pendingCount: number;
  /** ISO-8601 — OLDEST outstanding submission within the batch. */
  submittedAt: string;
}

/** The envelope's `data` payload: an object wrapping `items`, not a bare array. */
export interface PendingApprovalBatchListDto {
  items: PendingApprovalBatchResponseDto[];
}
