import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/**
 * Student self-scope: fetches the signed-in student's own class timetable.
 * The class is resolved inside the repository (mock-first, plan decision 6);
 * this use-case takes no args and just maps thrown failures to a Result.
 */
export class GetMyTimetableUseCase {
  constructor(private readonly repo: IWeeklyTimetableRepository) {}

  async execute(
    weekStart?: string,
  ): Promise<TimetableViewResult<WeeklyTimetable>> {
    try {
      return { ok: true, data: await this.repo.getMyTimetable(weekStart) };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
