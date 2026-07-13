/** Reporting term — exactly one selected at all times (spec §1). */
export type Term = "HK1" | "HK2" | "FULL_YEAR";

/**
 * School-wide dashboard summary for a term (INT-001).
 * Each `*Trend` is the "vs last term" delta, or `null` when no prior-term
 * baseline exists — presentation omits the trend chip entirely on null
 * (FR-004 AC-04.2), it is NEVER rendered as a misleading 0%.
 */
export interface ReportsSummaryEntity {
  totalStudents: number;
  totalStudentsTrend: number | null;
  schoolAverage: number;
  schoolAverageTrend: number | null;
  attendanceRate: number;
  attendanceRateTrend: number | null;
  incidentCount: number;
  incidentCountTrend: number | null;
}
