import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";

/** Poll cadence while any report row is still generating (state-design.md §10). */
export const POLL_INTERVAL_MS = 5000;

/**
 * Pure `refetchInterval` predicate for the periodic-reports query. Returns the
 * poll cadence while ANY row is `"generating"`, otherwise `false` (polling
 * stops). Extracted as a pure function so the poll decision is unit-testable
 * with plain fixtures — no fake timers, no `QueryClient` (state-design.md §10).
 */
export function getReportsPollInterval(
  items: ReportListItemEntity[] | undefined,
): number | false {
  if (!items) return false;
  return items.some((r) => r.status === "generating")
    ? POLL_INTERVAL_MS
    : false;
}
