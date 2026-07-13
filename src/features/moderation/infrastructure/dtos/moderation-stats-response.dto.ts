/** Stat-row wire shape (INT-191-02, embedded in the list response). */
export interface ModerationStatsResponseDto {
  pendingCount: number;
  resolvedThisWeekCount: number;
  removedCount: number;
}
