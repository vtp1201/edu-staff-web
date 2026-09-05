import type { PeriodPrep } from "../entities/period-prep.entity";
import type { IPeriodLogRepository } from "../repositories/i-period-log.repository";
import {
  fail,
  narrowPeriodLogFailure,
  ok,
  type PeriodLogResult,
} from "./period-log.result";

/** The week's saved period preps for one class — same server-filtered read
 *  posture as {@link import("./get-week-period-logs.use-case").GetWeekPeriodLogsUseCase}. */
export class GetWeekPeriodPrepsUseCase {
  constructor(private readonly repo: IPeriodLogRepository) {}

  async execute(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodLogResult<PeriodPrep[]>> {
    try {
      return ok(await this.repo.listPeriodPreps(classId, from, to));
    } catch (err) {
      return fail(narrowPeriodLogFailure(err));
    }
  }
}
