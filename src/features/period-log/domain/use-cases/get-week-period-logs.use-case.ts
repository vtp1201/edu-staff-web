import type { PeriodLog } from "../entities/period-log.entity";
import type { IPeriodLogRepository } from "../repositories/i-period-log.repository";
import {
  fail,
  narrowPeriodLogFailure,
  ok,
  type PeriodLogResult,
} from "./period-log.result";

/**
 * The week's saved period logs for one class. No authCtx: the READ is
 * server-filtered by core (ADMIN/MANAGER/homeroom see every row; any other
 * teacher sees only their own — an empty array, never a 403), so there is
 * nothing for the client to gate. The `[from, to]` span must stay ≤31 days,
 * which one rendered week trivially satisfies.
 */
export class GetWeekPeriodLogsUseCase {
  constructor(private readonly repo: IPeriodLogRepository) {}

  async execute(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodLogResult<PeriodLog[]>> {
    try {
      return ok(await this.repo.listPeriodLogs(classId, from, to));
    } catch (err) {
      return fail(narrowPeriodLogFailure(err));
    }
  }
}
