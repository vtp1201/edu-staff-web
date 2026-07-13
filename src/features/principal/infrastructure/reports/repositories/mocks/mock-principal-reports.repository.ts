import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import type { PrincipalReportsFailure } from "@/features/principal/domain/reports/failures/principal-reports.failure";
import type {
  IPrincipalReportsRepository,
  ReportListPage,
} from "@/features/principal/domain/reports/repositories/i-principal-reports.repository";
import {
  REPORTS_BY_TERM,
  SUBJECTS_BY_TERM,
  SUMMARY_BY_TERM,
  WEEKS_BY_TERM,
} from "./fixtures";

/** How long a newly-generated report stays "generating" before flipping to
 *  "ready" (evaluated against the injected clock, not a real timer). */
export const GENERATE_DELAY_MS = 8000;

/** A read/write method that `forceNextFailure` can target. */
type FailableMethod =
  | "getReportsSummary"
  | "getSubjectAverages"
  | "getAttendanceTrend"
  | "getPeriodicReports"
  | "generateReport";

/**
 * Reports appended at runtime via `generateReport`. Module-level (not
 * per-instance) so a "generating" row survives across DI-per-request repo
 * instances during a dev session — the poll then observes the transition
 * (mirrors the `principal-teachers` module-level-seed pattern, decision 0014).
 */
interface GeneratedRow {
  item: ReportListItemEntity;
  readyAt: number;
}
let generated: GeneratedRow[] = [];
let generatedSeq = 0;

/** Test-only: clear runtime-appended reports so specs stay isolated. */
export function resetMockPrincipalReports(): void {
  generated = [];
  generatedSeq = 0;
}

/**
 * MOCK-FIRST principal-reports repository (decision 0014).
 *
 * ⚠️ ANTI-DEMO (spec §0 / NFR-005 / AC-05.3): there is NO ordinal, counter,
 * session, or timer-based forced-failure logic here. A fresh instance with no
 * configuration ALWAYS resolves. The ONLY way any method rejects is an
 * explicit, one-shot `forceNextFailure(...)` opt-in invoked by test/QA code —
 * never a default. The mockup's `failedOnce` pattern is deliberately absent.
 */
export class MockPrincipalReportsRepository
  implements IPrincipalReportsRepository
{
  private readonly now: () => number;
  /** One-shot forced failures, keyed by method. Consumed on the next call. */
  private readonly pendingFailures = new Map<
    FailableMethod,
    PrincipalReportsFailure
  >();

  constructor(options?: { now?: () => number }) {
    this.now = options?.now ?? Date.now;
  }

  /**
   * Explicit, one-shot failure injection for exercising the error state in
   * tests/Storybook/manual QA. Defaults to unset (always succeed). The forced
   * failure is spent by the next matching call, then behavior reverts to
   * success — there is no persistent/default failure mode.
   */
  forceNextFailure(
    method: FailableMethod,
    failure: PrincipalReportsFailure,
  ): void {
    this.pendingFailures.set(method, failure);
  }

  private takeFailure(method: FailableMethod): PrincipalReportsFailure | null {
    const failure = this.pendingFailures.get(method);
    if (failure) {
      this.pendingFailures.delete(method);
      return failure;
    }
    return null;
  }

  async getReportsSummary(termId: Term): Promise<ReportsSummaryEntity> {
    await mockDelay();
    const failure = this.takeFailure("getReportsSummary");
    if (failure) throw failure;
    return SUMMARY_BY_TERM[termId];
  }

  async getSubjectAverages(termId: Term): Promise<SubjectAverageEntity[]> {
    await mockDelay();
    const failure = this.takeFailure("getSubjectAverages");
    if (failure) throw failure;
    return SUBJECTS_BY_TERM[termId];
  }

  async getAttendanceTrend(
    termId: Term,
  ): Promise<AttendanceTrendPointEntity[]> {
    await mockDelay();
    const failure = this.takeFailure("getAttendanceTrend");
    if (failure) throw failure;
    return WEEKS_BY_TERM[termId];
  }

  async getPeriodicReports(termId: Term): Promise<ReportListPage> {
    await mockDelay();
    const failure = this.takeFailure("getPeriodicReports");
    if (failure) throw failure;

    const now = this.now();
    const appended = generated
      .filter((g) => g.item.term === termId)
      .map<ReportListItemEntity>((g) => ({
        ...g.item,
        status: now >= g.readyAt ? "ready" : "generating",
      }));

    return {
      items: [...appended, ...REPORTS_BY_TERM[termId]],
      nextCursor: null,
      hasMore: false,
    };
  }

  async generateReport(termId: Term): Promise<ReportListItemEntity> {
    await mockDelay();
    const failure = this.takeFailure("generateReport");
    if (failure) throw failure;

    const now = this.now();
    generatedSeq += 1;
    const item: ReportListItemEntity = {
      id: `r-gen-${generatedSeq}`,
      name: "Báo cáo tổng hợp mới",
      term: termId,
      createdAt: new Date(now).toISOString(),
      status: "generating",
    };
    generated = [{ item, readyAt: now + GENERATE_DELAY_MS }, ...generated];
    return item;
  }
}
