import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";

/**
 * Uniform Server Action result. TanStack Query's `queryFn` branches ok/fail
 * without a try/catch at every call site; on `ok: false` it throws `{ errorKey }`
 * so `useQuery`'s own `isError`/`error` reflects it (state-design.md §9).
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorKey: PrincipalReportsFailure["type"] };

/**
 * Server → client boundary contract for `ReportsScreen` (US-E03.1). `page.tsx`
 * resolves `initialTerm` server-side (cheap, synchronous default) and wires the
 * 5 Server Action refs; all data is fetched client-side so each of the 4
 * regions gets its own loading/error/empty/success + term-driven re-fetch.
 */
export interface ReportsScreenVM {
  /** BE-resolved current term or the "HK2" fallback (spec §8). Seeds the
   *  controlled `term` state — read once at mount, never re-derived. */
  initialTerm: Term;

  getReportsSummaryAction: (
    termId: Term,
  ) => Promise<ActionResult<ReportsSummaryEntity>>;
  getSubjectAveragesAction: (
    termId: Term,
  ) => Promise<ActionResult<SubjectAverageEntity[]>>;
  getAttendanceTrendAction: (
    termId: Term,
  ) => Promise<ActionResult<AttendanceTrendPointEntity[]>>;
  getPeriodicReportsAction: (
    termId: Term,
  ) => Promise<ActionResult<ReportListItemEntity[]>>;

  /** Should (FR-008). On success the table appends the returned `generating`
   *  row (via list invalidation); on failure nothing is added (AC-07.3). */
  generateReportAction: (
    termId: Term,
  ) => Promise<ActionResult<ReportListItemEntity>>;
}

export type ReportsScreenProps = ReportsScreenVM;

export type {
  AttendanceTrendPointEntity,
  ReportListItemEntity,
  ReportsSummaryEntity,
  SubjectAverageEntity,
  Term,
};
