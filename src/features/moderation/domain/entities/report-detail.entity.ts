import type { ReportEntity } from "./report.entity";

/** One other report on the same content (FR-110 duplicate list). */
export interface DuplicateReportRef {
  reportId: string;
  reporterName: string;
  createdAt: string;
}

/**
 * One context item shown in the detail sheet (FR-105): for a comment report the
 * original post; for a message report the nearby messages with the reported one
 * flagged (`highlighted: true`). Empty for post reports (the post itself is
 * `fullContent`).
 */
export interface ReportContextItem {
  authorName: string;
  text: string;
  highlighted: boolean;
}

/**
 * Full report detail (INT-191-03) — the queue row plus untruncated content,
 * surrounding context, and the duplicate-report list. Never derived from the
 * list row (FR-105 no-stale-render rule); always its own fetch.
 */
export interface ReportDetailEntity extends ReportEntity {
  fullContent: string;
  context: ReportContextItem[];
  duplicateReports: DuplicateReportRef[];
}
