import type { ReportEntity } from "./report.entity";

/** One other report on the same content (mock-only — see below). */
export interface DuplicateReportRef {
  reportId: string;
  reporterName: string;
  createdAt: string;
}

/**
 * One context item shown in the detail sheet: for a comment report the original
 * post; for a message report the nearby messages with the reported one flagged
 * (`highlighted: true`). Mock-only — see below.
 */
export interface ReportContextItem {
  authorName: string;
  text: string;
  highlighted: boolean;
}

/**
 * Full report detail.
 *
 * **US-E18.32 re-ground-truth:** `GET /reports/{reportId}` returns the SAME
 * `ReportInboxItem` shape as the list ("so the list and detail responses can
 * never drift"). It resolves NO untruncated content, NO surrounding context and
 * NO duplicate-report list — each would need a second, cross-aggregate read the
 * service does not offer. The three fields below are therefore `null` on every
 * real read and populated only by the mock; presentation omits the section
 * entirely when `null` (a "0 duplicates" line would assert something we never
 * learned).
 *
 * The detail read is still its OWN fetch (never derived from the cached list
 * row) — it re-reads server-authoritative resolution state (FR-105).
 */
export interface ReportDetailEntity extends ReportEntity {
  /** Untruncated content — mock only; `null` on every real read. */
  fullContent: string | null;
  /** Surrounding context — mock only; `null` on every real read. */
  context: ReportContextItem[] | null;
  /** Other reports on the same content — mock only; `null` on every real read. */
  duplicateReports: DuplicateReportRef[] | null;
}
