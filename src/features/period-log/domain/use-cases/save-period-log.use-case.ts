import type {
  PeriodLog,
  SavePeriodLogInput,
} from "../entities/period-log.entity";
import type { PeriodLogAuthContext } from "../entities/period-log-auth-context.entity";
import { ownsSlot } from "../entities/period-log-auth-context.entity";
import type { IPeriodLogRepository } from "../repositories/i-period-log.repository";
import {
  fail,
  ok,
  type PeriodLogResult,
  toPeriodLogFailure,
} from "./period-log.result";

export interface SavePeriodLogParams {
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  periodNumber: number;
  /** The slot's CURRENT teacher, read from the timetable the page rendered. */
  assignedTeacherMemberId: string;
  termId: string;
  academicYearId: string;
  input: SavePeriodLogInput;
}

/**
 * Ghi sổ đầu bài tiết (PUT, idempotent full replace).
 *
 * The ownership assertion is the FIRST statement, before the repository is
 * touched (decision 0063 §5's ordering requirement, applied one layer up from
 * the repository — see `period-log-auth-context.entity.ts` for why the guard
 * lives here: core re-derives the slot's teacher itself, so the repository has
 * nothing of its own to check, while the ONE fact the guard needs
 * (`assignedTeacherMemberId`) is already known to the caller that rendered the
 * row). A denial returns the SAME failure the BE's fused 422 maps to, so the UI
 * cannot become an occupancy oracle either.
 */
export class SavePeriodLogUseCase {
  constructor(private readonly repo: IPeriodLogRepository) {}

  async execute(
    authCtx: PeriodLogAuthContext,
    params: SavePeriodLogParams,
  ): Promise<PeriodLogResult<PeriodLog>> {
    if (!ownsSlot(authCtx, params.assignedTeacherMemberId)) {
      return fail({ type: "slot-forbidden-or-missing" });
    }
    try {
      return ok(
        await this.repo.savePeriodLog(
          params.classId,
          params.date,
          params.periodNumber,
          { termId: params.termId, academicYearId: params.academicYearId },
          params.input,
        ),
      );
    } catch (err) {
      return fail(toPeriodLogFailure(err));
    }
  }
}
