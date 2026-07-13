import {
  DEFAULT_REPORT_QUEUE_FILTER,
  type ReportContentTypeFilter,
  type ReportQueueFilter,
  type ReportStatusTab,
} from "../../../domain/entities/report-queue-filter.entity";

export type ModerationTab = "queue" | "audit";

const STATUS_SET = new Set<ReportStatusTab>(["pending", "resolved", "all"]);
const TYPE_SET = new Set<ReportContentTypeFilter>([
  "all",
  "post",
  "comment",
  "message",
]);

/**
 * Parse the applied queue filter from URL params (US-E19.2). Unknown/empty
 * values fall back to defaults so the filter (and its query key) is stable —
 * the default filter and an empty query string hash identically.
 */
export function parseFilterFromParams(
  params: URLSearchParams,
): ReportQueueFilter {
  const status = params.get("status");
  const contentType = params.get("type");
  const search = params.get("q")?.trim() ?? "";
  return {
    status:
      status && STATUS_SET.has(status as ReportStatusTab)
        ? (status as ReportStatusTab)
        : DEFAULT_REPORT_QUEUE_FILTER.status,
    contentType:
      contentType && TYPE_SET.has(contentType as ReportContentTypeFilter)
        ? (contentType as ReportContentTypeFilter)
        : DEFAULT_REPORT_QUEUE_FILTER.contentType,
    search,
  };
}

/** Parse the active tab (defaults to the queue). */
export function parseTabFromParams(params: URLSearchParams): ModerationTab {
  return params.get("tab") === "audit" ? "audit" : "queue";
}

/** Serialize filter + tab to a query string (omitting default/empty values). */
export function toQueryString(
  filter: ReportQueueFilter,
  tab: ModerationTab,
): string {
  const params = new URLSearchParams();
  if (tab === "audit") params.set("tab", "audit");
  if (filter.status !== DEFAULT_REPORT_QUEUE_FILTER.status) {
    params.set("status", filter.status);
  }
  if (filter.contentType !== DEFAULT_REPORT_QUEUE_FILTER.contentType) {
    params.set("type", filter.contentType);
  }
  if (filter.search.trim()) params.set("q", filter.search.trim());
  return params.toString();
}

/** Structural equality of two filters (empty-normalized). */
export function filtersEqual(
  a: ReportQueueFilter,
  b: ReportQueueFilter,
): boolean {
  return (
    a.status === b.status &&
    a.contentType === b.contentType &&
    a.search.trim() === b.search.trim()
  );
}
