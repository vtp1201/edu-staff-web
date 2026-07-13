/** Reported content kind (INT-191-01/02). */
export type ReportKind = "post" | "comment" | "message";

/** Report lifecycle status. `dismissed`/`removed` are the two resolved terminals. */
export type ReportStatus = "pending" | "dismissed" | "removed";

/**
 * Report reason — the BE wire enum (integration.md INT-191-01). Matches the
 * shared ReportContentDialog's `ReportReasonId` value-for-value; declared
 * independently here so the domain has zero dependency on the presentation
 * component (Clean Architecture — domain imports nothing outward).
 */
export type ReportReason =
  | "spam"
  | "inappropriate-language"
  | "bullying"
  | "misinformation"
  | "other";

/**
 * A moderation report as it appears in the queue (INT-191-02 row). PII fields
 * (reporterId/reporterName, reason, note, resolveNote) are Confidential —
 * principal-only.
 */
export interface ReportEntity {
  id: string;
  kind: ReportKind;
  contentId: string;
  contentPreview: string;
  authorId: string;
  authorName: string;
  reporterId: string;
  reporterName: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  /** Number of OTHER reports on the same contentId (FR-110). */
  duplicateCount: number;
  /** Present only when status !== "pending". */
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolveNote: string | null;
}
