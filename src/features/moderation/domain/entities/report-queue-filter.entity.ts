/** Queue status tab (FR-104). */
export type ReportStatusTab = "pending" | "resolved" | "all";

/** Content-type filter (FR-104). */
export type ReportContentTypeFilter = "all" | "post" | "comment" | "message";

/**
 * Queue filter (FR-104) — status tab + content-type + free-text search combine
 * as AND. Drives the list query key; URL-synced in presentation.
 * (component-architecture.md flag #2 — small value entity given its own file.)
 */
export interface ReportQueueFilter {
  status: ReportStatusTab;
  contentType: ReportContentTypeFilter;
  search: string;
}

/** Canonical default filter (pending tab, no type/search narrowing). */
export const DEFAULT_REPORT_QUEUE_FILTER: ReportQueueFilter = {
  status: "pending",
  contentType: "all",
  search: "",
};
