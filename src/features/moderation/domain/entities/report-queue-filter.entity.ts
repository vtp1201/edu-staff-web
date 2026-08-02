/**
 * Queue status tab. US-E18.32: the wire's `status` param selects exactly ONE
 * ScyllaDB partition (`PENDING` | `RESOLVED`) and `all` is **deliberately not
 * supported** by the service ("it would need two partition walks plus a merge,
 * and the page size would stop being deterministic"). The former `all` tab was
 * therefore removed rather than faked by a client-side merge.
 */
export type ReportStatusTab = "pending" | "resolved";

/** Content-type filter — `all` means "omit the `contentType` param". */
export type ReportContentTypeFilter = "all" | "post" | "comment" | "message";

/**
 * Queue filter (FR-104) — status tab + content-type + free-text search combine
 * as AND, all applied SERVER-side. `search` matches the reporter's free-text
 * reason (`reasonFreeText`) only — never the reason category.
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
