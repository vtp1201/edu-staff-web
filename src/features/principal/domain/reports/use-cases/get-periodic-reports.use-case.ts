import type { Term } from "../entities/reports-summary.entity";
import type {
  IPrincipalReportsRepository,
  ReportListPage,
} from "../repositories/i-principal-reports.repository";

/** Thin delegate — INT-004. */
export class GetPeriodicReportsUseCase {
  constructor(private readonly repo: IPrincipalReportsRepository) {}

  execute(termId: Term, cursor?: string): Promise<ReportListPage> {
    return this.repo.getPeriodicReports(termId, cursor);
  }
}
