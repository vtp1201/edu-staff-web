/**
 * `GET /reports/stats` payload (US-172). FLAT tenant-wide totals — explicitly
 * unfiltered by any `contentType`/`search` applied to the list endpoint, and
 * best-effort/eventually consistent (read from a counter table, not a live
 * `COUNT(*)`). A tenant with no reports returns `{pending: 0, resolved: 0}`,
 * never a 404.
 */
export interface ModerationStatsResponseDto {
  pending: number;
  resolved: number;
}
