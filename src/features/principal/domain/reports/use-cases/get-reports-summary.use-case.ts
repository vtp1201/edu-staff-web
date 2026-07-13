import type {
  ReportsSummaryEntity,
  Term,
} from "../entities/reports-summary.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";

/** Thin delegate — INT-001. Trend-omission is a presentation decision. */
export class GetReportsSummaryUseCase {
  constructor(private readonly repo: IPrincipalReportsRepository) {}

  execute(termId: Term): Promise<ReportsSummaryEntity> {
    return this.repo.getReportsSummary(termId);
  }
}
