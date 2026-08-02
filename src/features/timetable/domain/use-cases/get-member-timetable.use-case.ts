import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/**
 * Member-scoped read (US-E15.3, principal viewing a teacher's week). A THIN
 * wrapper over the already-real `getByMember` (US-E18.26) — deliberately NOT a
 * roster-validating use-case like {@link import("./get-child-timetable.use-case").GetChildTimetableUseCase}:
 * - the principal's picker source and the fetch source are the SAME teacher
 *   list, so a second roster lookup could only ever re-confirm what the caller
 *   just read (dead code, plus an extra request per switch);
 * - there is no class identity to compose on either — a teacher's week spans
 *   several classes, each slot carrying its own `className`
 *   (`cellVariant="teacher"` renders it), so the repository's week is returned
 *   untouched.
 *
 * `not-found` (teacher has no published schedule) propagates as-is; the
 * presentation layer collapses it to the "not published yet" empty state.
 */
export class GetMemberTimetableUseCase {
  constructor(private readonly repo: IWeeklyTimetableRepository) {}

  async execute(
    memberId: string,
    weekStart?: string,
  ): Promise<TimetableViewResult<WeeklyTimetable>> {
    try {
      return {
        ok: true,
        data: await this.repo.getByMember(memberId, weekStart),
      };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
