import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import type { CalendarFailure } from "../../domain/failures/calendar.failure";

export interface CalendarScreenVM {
  years: AcademicYear[];
}

/** Stable failure key returned by server actions (presentation translates it). */
export type CalendarErrorKey = CalendarFailure["type"];

export type ActionResult<T = unknown> =
  | (T extends object ? { ok: true } & T : { ok: true })
  | { ok: false; errorKey: CalendarErrorKey };

export interface CalendarActions {
  createYearAction(
    label: string,
    isActive: boolean,
  ): Promise<ActionResult<{ year: AcademicYear }>>;
  createTermAction(
    yearId: string,
    name: string,
    startDate: string,
    endDate: string,
  ): Promise<
    ActionResult<{ term: import("../../domain/entities/term.entity").Term }>
  >;
  updateTermAction(
    yearId: string,
    termId: string,
    name: string,
    startDate: string,
    endDate: string,
  ): Promise<
    ActionResult<{ term: import("../../domain/entities/term.entity").Term }>
  >;
  deleteTermAction(
    yearId: string,
    termId: string,
    hasGrades: boolean,
  ): Promise<ActionResult>;
}
