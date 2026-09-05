import type { PeriodLogAuthContext } from "../entities/period-log-auth-context.entity";
import { ownsSlot } from "../entities/period-log-auth-context.entity";
import type {
  PeriodPrep,
  SavePeriodPrepInput,
} from "../entities/period-prep.entity";
import { MAX_MATERIALS } from "../entities/period-prep.entity";
import type { IPeriodLogRepository } from "../repositories/i-period-log.repository";
import {
  fail,
  ok,
  type PeriodLogResult,
  toPeriodLogFailure,
} from "./period-log.result";

export interface SavePeriodPrepParams {
  classId: string;
  date: string;
  periodNumber: number;
  assignedTeacherMemberId: string;
  termId: string;
  academicYearId: string;
  input: SavePeriodPrepInput;
}

/**
 * Lưu chuẩn bị tiết (PUT, idempotent full replace of note/plan/materials).
 *
 * Two guards, both before the repository: the slot-ownership assertion
 * (decision 0063) and the ≤20 materials cap. The cap is enforced here — not
 * only by the form's disabled "+ Thêm" and not only by the BE's
 * `PERIOD_PREP_TOO_MANY_MATERIALS` backstop — so a 21st link can never cost a
 * round trip regardless of which caller assembled the input.
 */
export class SavePeriodPrepUseCase {
  constructor(private readonly repo: IPeriodLogRepository) {}

  async execute(
    authCtx: PeriodLogAuthContext,
    params: SavePeriodPrepParams,
  ): Promise<PeriodLogResult<PeriodPrep>> {
    if (!ownsSlot(authCtx, params.assignedTeacherMemberId)) {
      return fail({ type: "slot-forbidden-or-missing" });
    }
    if (params.input.materials.length > MAX_MATERIALS) {
      return fail({ type: "too-many-materials" });
    }
    try {
      return ok(
        await this.repo.savePeriodPrep(
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
