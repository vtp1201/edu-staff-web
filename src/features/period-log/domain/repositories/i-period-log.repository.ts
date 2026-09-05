import type {
  PeriodLog,
  SavePeriodLogInput,
} from "../entities/period-log.entity";
import type {
  PeriodPrep,
  SavePeriodPrepInput,
} from "../entities/period-prep.entity";

/**
 * Term context every period-log/period-prep WRITE must carry. Both ids are
 * required by the contract: `academicYearId` is validation-only input (the
 * term's date range is checked against `date` BEFORE the slot is resolved, so a
 * stale `termId` from a closed term cannot resolve the current term's occupant
 * — VULN-232-001). Neither is ever stored on the row.
 */
export interface PeriodTermContext {
  termId: string;
  academicYearId: string;
}

/**
 * ONE repository for both sub-resources of the same bounded context (same
 * addressing key, same authorization rule, same service) — the `staff-discipline`
 * one-repo/two-sub-resource precedent.
 *
 * Implementations THROW a `PeriodLogFailure`; use-cases catch and return a
 * `PeriodLogResult`. Reads are range-scoped only: a per-period GET exists on the
 * wire but this UI never needs it (the week list already carries every row).
 */
export interface IPeriodLogRepository {
  listPeriodLogs(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodLog[]>;
  savePeriodLog(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
    input: SavePeriodLogInput,
  ): Promise<PeriodLog>;
  deletePeriodLog(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
  ): Promise<void>;

  listPeriodPreps(
    classId: string,
    from: string,
    to: string,
  ): Promise<PeriodPrep[]>;
  savePeriodPrep(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
    input: SavePeriodPrepInput,
  ): Promise<PeriodPrep>;
  deletePeriodPrep(
    classId: string,
    date: string,
    periodNumber: number,
    ctx: PeriodTermContext,
  ): Promise<void>;
}
