/** Reported content kind (wire `targetType` ∈ MESSAGE|POST|COMMENT). */
export type ReportKind = "post" | "comment" | "message";

/**
 * Report lifecycle status, flattened from the wire's two fields
 * (`status` ∈ PENDING|RESOLVED × `resolutionOutcome` ∈ DISMISS|DELETE|ESCALATE).
 *
 * `escalated` (US-E18.32) is READ-ONLY: this app never issues `ESCALATE`, but
 * another ADMIN can, and such a row appears in the RESOLVED partition — mapping
 * it to `dismissed` would misreport a severity decision as a no-op.
 */
export type ReportStatus = "pending" | "dismissed" | "removed" | "escalated";

/**
 * Report reason — the web-side vocabulary. Maps 1:1 to the wire's
 * `reasonCategory` enum in `moderation.mapper.ts` (`bullying` ↔ `HARASSMENT`,
 * `inappropriate-language` ↔ `INAPPROPRIATE_CONTENT`, …). Matches the shared
 * ReportContentDialog's `ReportReasonId` value-for-value; declared independently
 * here so the domain has zero dependency on the presentation component.
 */
export type ReportReason =
  | "spam"
  | "inappropriate-language"
  | "bullying"
  | "misinformation"
  | "other";

/**
 * The composite key that ADDRESSES one report row (US-E18.32).
 *
 * `reportId` is a ScyllaDB **clustering column, not a partition key**, so it
 * alone cannot locate a row: every point-read (`GET /reports/{reportId}`) and
 * CAS write (`POST /reports/{reportId}/resolve`) additionally needs the
 * partition-locating `filedAt` (REQUIRED) and `status` partition, echoed
 * VERBATIM from the list response that produced the row (OQ-098-12).
 *
 * Consequence enforced across this feature: a report detail is only reachable
 * FROM a list row carrying the whole tuple — never from a bare id, and
 * therefore never from a bookmarkable `/reports/{id}` URL.
 */
export interface ReportRef {
  reportId: string;
  /** Echo of the row's `filedAt` — part of the primary key, REQUIRED. */
  filedAt: string;
  /** The row's status partition. Only a `pending` row is resolvable. */
  status: ReportStatus;
}

/**
 * A moderation report as it appears in the queue.
 *
 * **Nullable identity fields (US-E18.32).** The real `ReportInboxItem` carries
 * ONLY the report row: id, target reference, reason, timestamps and resolution
 * state. It deliberately never declares a reporter identity (NFR-098-01 — a
 * permanent privacy posture, not a missing field), and carries no denormalized
 * copy of the reported content or its author. Those fields are therefore `null`
 * on every real read and are populated only by the mock. Presentation must
 * treat `null` as "not available from the server" and omit the affordance —
 * never render a placeholder or invent a value.
 */
export interface ReportEntity {
  id: string;
  kind: ReportKind;
  /** The reported message/post/comment id (wire `targetId`). */
  contentId: string;
  /** Denormalized preview — mock only; `null` on every real read. */
  contentPreview: string | null;
  /** Content author — mock only; `null` on every real read. */
  authorId: string | null;
  authorName: string | null;
  /** Reporter identity — mock only; PERMANENTLY `null` on real reads (NFR-098-01). */
  reporterId: string | null;
  reporterName: string | null;
  reason: ReportReason;
  /** Wire `reasonFreeText` — required iff reason = "other". */
  note: string | null;
  status: ReportStatus;
  /** Wire `filedAt`. Also the point-read/CAS key — see {@link ReportRef}. */
  createdAt: string;
  /**
   * Number of OTHER reports on the same content. `null` = the server has no
   * duplicate-report concept (every real read); a number only from the mock.
   */
  duplicateCount: number | null;
  /** Present only when status !== "pending". */
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolveNote: string | null;
}

/** Build the addressing tuple for a row already read from a list page. */
export function reportRefOf(report: ReportEntity): ReportRef {
  return {
    reportId: report.id,
    filedAt: report.createdAt,
    status: report.status,
  };
}
