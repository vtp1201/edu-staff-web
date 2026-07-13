import type { ReportListItemEntity } from "../entities/report-list-item.entity";
import type { Term } from "../entities/reports-summary.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";

/** Thin delegate — INT-005. Result always has status "generating". */
export class GenerateReportUseCase {
  constructor(private readonly repo: IPrincipalReportsRepository) {}

  execute(termId: Term): Promise<ReportListItemEntity> {
    return this.repo.generateReport(termId);
  }
}
