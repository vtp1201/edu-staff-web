import type { AttendanceTrendPointEntity } from "../entities/attendance-trend-point.entity";
import type { Term } from "../entities/reports-summary.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";

/** Thin delegate — INT-003. */
export class GetAttendanceTrendUseCase {
  constructor(private readonly repo: IPrincipalReportsRepository) {}

  execute(termId: Term): Promise<AttendanceTrendPointEntity[]> {
    return this.repo.getAttendanceTrend(termId);
  }
}
