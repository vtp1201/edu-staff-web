/** INT-001 wire shape (camelCase, decision 0008). Trend fields nullable. */
export interface ReportsSummaryResponseDto {
  totalStudents: number;
  totalStudentsTrend: number | null;
  schoolAverage: number;
  schoolAverageTrend: number | null;
  attendanceRate: number;
  attendanceRateTrend: number | null;
  incidentCount: number;
  incidentCountTrend: number | null;
}
