import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/**
 * Class-scoped weekly read (US-E24.9) — the first caller `getByClass` has ever
 * had. The repository method was written contract-correct in US-E18.11 and
 * force-routed to mock only because nothing called it; the class hub's
 * timetable tab is exactly the "direct class-scoped use-case" the hybrid
 * repository's doc reserved that seam for, so the force-mock is lifted with it.
 *
 * Thin by design: authorization is core's (a teacher who is not assigned to the
 * class gets the same not-found the empty state renders), and this week is one
 * class's grid, so there is nothing to compose.
 */
export class GetClassTimetableUseCase {
  constructor(private readonly repo: IWeeklyTimetableRepository) {}

  async execute(
    classId: string,
    weekStart?: string,
  ): Promise<TimetableViewResult<WeeklyTimetable>> {
    try {
      return { ok: true, data: await this.repo.getByClass(classId, weekStart) };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
