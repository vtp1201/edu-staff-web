/**
 * Queue stat row. US-E18.32 re-ground-truth: these come from their OWN endpoint
 * (`GET /reports/stats`, US-172), NEVER from a list page's item count — the list
 * is filtered AND cursor-paginated, so deriving counts from it under-reports the
 * tenant-wide truth. Values are best-effort/eventually consistent (BE reads a
 * counter table; a reconciler corrects drift).
 *
 * The wire is a FLAT `{pending, resolved}`. The former `resolvedThisWeekCount`
 * (a 7-day window) and `removedCount` (the DELETE-outcome subset) have no
 * backing at all and were dropped rather than approximated.
 */
export interface ModerationStatsEntity {
  pendingCount: number;
  resolvedCount: number;
}
