/**
 * Stat-row counts (FR-103). Per the resolved assumption (integration.md
 * INT-191-02) these ride inside every `GET /reports` list-page response, not a
 * separate endpoint — which is why any status-changing mutation invalidates the
 * whole list subtree (state-design.md §5).
 */
export interface ModerationStatsEntity {
  pendingCount: number;
  resolvedThisWeekCount: number;
  removedCount: number;
}
