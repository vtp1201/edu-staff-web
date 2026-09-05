import "server-only";

import type { AxiosInstance } from "axios";
import { PERIOD_LOG_EP } from "@/bootstrap/endpoint/period-log.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type {
  PeriodLog,
  SavePeriodLogInput,
} from "../../domain/entities/period-log.entity";
import type {
  PeriodPrep,
  SavePeriodPrepInput,
} from "../../domain/entities/period-prep.entity";
import type { PeriodLogFailure } from "../../domain/failures/period-log.failure";
import type {
  IPeriodLogRepository,
  PeriodTermContext,
} from "../../domain/repositories/i-period-log.repository";
import type { PeriodLogResponseDto } from "../dtos/period-log-response.dto";
import type { PeriodPrepResponseDto } from "../dtos/period-prep-response.dto";
import { toPeriodLog, toPeriodPrep } from "../mappers/period-log.mapper";

/**
 * Map a normalised `ApiError` to the shared failure union — by UPPER_SNAKE
 * `error.code`, never by message (api-integration rule).
 *
 * The two `*_NO_SLOT` codes and a bare 403 collapse into ONE failure on
 * purpose: core fuses "no slot" / "not your slot" / "MANAGER read-only" /
 * "weekend" / "outside the term" into a single 422 so the write path is not an
 * occupancy oracle (VULN-233-001). Re-splitting them client-side would rebuild
 * exactly the oracle the BE removed, so the UI shows one banner for all of them.
 *
 * `PERIOD_LOG_TERM_MISMATCH` (409) is period-LOG only — the prep contract lists
 * no 409, so no prep branch manufactures one.
 */
export function toPeriodLogFailure(err: unknown): PeriodLogFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (
    code === "PERIOD_LOG_NO_SLOT" ||
    code === "PERIOD_PREP_NO_SLOT" ||
    status === 403
  ) {
    return { type: "slot-forbidden-or-missing" };
  }
  if (code === "PERIOD_LOG_TERM_MISMATCH") return { type: "term-mismatch" };
  if (code === "PERIOD_PREP_TOO_MANY_MATERIALS") {
    return { type: "too-many-materials" };
  }
  if (code === "PERIOD_PREP_LESSON_PLAN_NOT_OWNED") {
    return { type: "lesson-plan-not-owned" };
  }
  if (
    code === "VALIDATION_FAILED" ||
    code?.startsWith("PERIOD_LOG_INVALID_") ||
    code?.startsWith("PERIOD_PREP_INVALID_")
  ) {
    return { type: "validation" };
  }
  if (
    code === "PERIOD_LOG_NOT_FOUND" ||
    code === "PERIOD_PREP_NOT_FOUND" ||
    status === 404
  ) {
    return { type: "not-found" };
  }
  return { type: "unknown" };
}

/**
 * Real HTTP repository for both period sub-resources (US-E24.9).
 *
 * Writes are idempotent FULL REPLACES (`PUT`), never patches. `termId` +
 * `academicYearId` ride in the PUT **body** and, on DELETE, in the **query
 * string** (the contract declares them as required query params there — a
 * DELETE body would simply be dropped and the call would 422).
 *
 * Both list endpoints are unpaginated bare arrays bounded by the ≤31-day span
 * cap, so neither uses `{ raw: true }`/`parseEnvelope`.
 */
export class PeriodLogRepository implements IPeriodLogRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listPeriodLogs(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodLog[]> {
    try {
      const dtos = (await this.http.get(PERIOD_LOG_EP.logsRange(classId), {
        params: { from, to },
      })) as unknown as PeriodLogResponseDto[] | null;
      return (dtos ?? []).map(toPeriodLog);
    } catch (err) {
      throw toPeriodLogFailure(err);
    }
  }

  async savePeriodLog(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
    input: SavePeriodLogInput,
  ): Promise<PeriodLog> {
    try {
      const dto = (await this.http.put(
        PERIOD_LOG_EP.logs(classId, date, periodNumber),
        {
          termId: ctx.termId,
          academicYearId: ctx.academicYearId,
          lessonTitle: input.lessonTitle,
          // The wire models "no remark" as "", never null/omitted.
          remark: input.remark ?? "",
          grade: input.grade,
          absentCount: input.absentCount,
        },
      )) as unknown as PeriodLogResponseDto;
      return toPeriodLog(dto);
    } catch (err) {
      throw toPeriodLogFailure(err);
    }
  }

  async deletePeriodLog(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
  ): Promise<void> {
    try {
      await this.http.delete(PERIOD_LOG_EP.logs(classId, date, periodNumber), {
        params: { termId: ctx.termId, academicYearId: ctx.academicYearId },
      });
    } catch (err) {
      throw toPeriodLogFailure(err);
    }
  }

  async listPeriodPreps(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodPrep[]> {
    try {
      const dtos = (await this.http.get(PERIOD_LOG_EP.prepsRange(classId), {
        params: { from, to },
      })) as unknown as PeriodPrepResponseDto[] | null;
      return (dtos ?? []).map(toPeriodPrep);
    } catch (err) {
      throw toPeriodLogFailure(err);
    }
  }

  async savePeriodPrep(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
    input: SavePeriodPrepInput,
  ): Promise<PeriodPrep> {
    try {
      // `lessonPlanId` is OMITTED (not null) when unset: the request schema
      // declares it as an optional uuid, so a null would fail format validation.
      const body: Record<string, unknown> = {
        termId: ctx.termId,
        academicYearId: ctx.academicYearId,
        note: input.note ?? "",
        materials: input.materials,
      };
      if (input.lessonPlanId) body.lessonPlanId = input.lessonPlanId;

      const dto = (await this.http.put(
        PERIOD_LOG_EP.preps(classId, date, periodNumber),
        body,
      )) as unknown as PeriodPrepResponseDto;
      return toPeriodPrep(dto);
    } catch (err) {
      throw toPeriodLogFailure(err);
    }
  }

  async deletePeriodPrep(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
  ): Promise<void> {
    try {
      await this.http.delete(PERIOD_LOG_EP.preps(classId, date, periodNumber), {
        params: { termId: ctx.termId, academicYearId: ctx.academicYearId },
      });
    } catch (err) {
      throw toPeriodLogFailure(err);
    }
  }
}
