import type { AttendanceTrendPointEntity } from "../entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "../entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "../entities/reports-summary.entity";
import type { SubjectAverageEntity } from "../entities/subject-average.entity";

/**
 * Cursor page for the periodic-reports list (INT-004). The envelope's
 * `meta.pagination` is read at the repo boundary; the presentation layer uses
 * only `items` today (single-page `useQuery`, state-design §4) but the shape
 * keeps a later `useInfiniteQuery` upgrade additive.
 */
export interface ReportListPage {
  items: ReportListItemEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Domain contract for the principal-reports data needs (INT-001..005),
 * MOCK-FIRST (decision 0014). Methods RESOLVE the entity on success and THROW
 * a {@link PrincipalReportsFailure} on failure (matches the `discipline`
 * throwing precedent, not the `Result`-returning `principal-teachers` one).
 */
export interface IPrincipalReportsRepository {
  getReportsSummary(termId: Term): Promise<ReportsSummaryEntity>;
  getSubjectAverages(termId: Term): Promise<SubjectAverageEntity[]>;
  getAttendanceTrend(termId: Term): Promise<AttendanceTrendPointEntity[]>;
  getPeriodicReports(termId: Term, cursor?: string): Promise<ReportListPage>;
  /** Always resolves with `status: "generating"` (INT-005, never `"ready"`). */
  generateReport(termId: Term): Promise<ReportListItemEntity>;
}
