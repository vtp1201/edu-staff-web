import type { PeriodLogAuthContext } from "../entities/period-log-auth-context.entity";
import { ownsSlot } from "../entities/period-log-auth-context.entity";
import type { IPeriodLogRepository } from "../repositories/i-period-log.repository";
import type { DeletePeriodParams } from "./delete-period-log.use-case";
import {
  fail,
  narrowPeriodLogFailure,
  ok,
  type PeriodLogResult,
} from "./period-log.result";

/** Xoá chuẩn bị tiết. Same guard-first shape as its period-log twin. */
export class DeletePeriodPrepUseCase {
  constructor(private readonly repo: IPeriodLogRepository) {}

  async execute(
    authCtx: PeriodLogAuthContext,
    params: DeletePeriodParams,
  ): Promise<PeriodLogResult<void>> {
    if (!ownsSlot(authCtx, params.assignedTeacherMemberId)) {
      return fail({ type: "slot-forbidden-or-missing" });
    }
    try {
      await this.repo.deletePeriodPrep(
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
