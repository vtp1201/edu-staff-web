import type { Term } from "../entities/reports-summary.entity";
import type { SubjectAverageEntity } from "../entities/subject-average.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";

/** Thin delegate — INT-002. Empty-array pass-through (empty state = presentation). */
export class GetSubjectAveragesUseCase {
  constructor(private readonly repo: IPrincipalReportsRepository) {}

  execute(termId: Term): Promise<SubjectAverageEntity[]> {
    return this.repo.getSubjectAverages(termId);
  }
}
