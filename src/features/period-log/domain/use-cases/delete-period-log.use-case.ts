import type { PeriodLogAuthContext } from "../entities/period-log-auth-context.entity";
import { ownsSlot } from "../entities/period-log-auth-context.entity";
import type { IPeriodLogRepository } from "../repositories/i-period-log.repository";
import {
  fail,
  narrowPeriodLogFailure,
  ok,
  type PeriodLogResult,
} from "./period-log.result";

export interface DeletePeriodParams {
  classId: string;
  date: string;
  periodNumber: number;
  assignedTeacherMemberId: string;
  termId: string;
  academicYearId: string;
}

/** Xoá sổ đầu bài tiết. Same guard-first shape as `SavePeriodLogUseCase`. */
export class DeletePeriodLogUseCase {
  constructor(private readonly repo: IPeriodLogRepository) {}

  async execute(
    authCtx: PeriodLogAuthContext,
    params: DeletePeriodParams,
  ): Promise<PeriodLogResult<void>> {
    if (!ownsSlot(authCtx, params.assignedTeacherMemberId)) {
      return fail({ type: "slot-forbidden-or-missing" });
    }
    try {
      await this.repo.deletePeriodLog(
        params.classId,
        params.date,
        params.periodNumber,
        { termId: params.termId, academicYearId: params.academicYearId },
      );
      return ok(undefined);
    } catch (err) {
      return fail(narrowPeriodLogFailure(err));
    }
  }
}
