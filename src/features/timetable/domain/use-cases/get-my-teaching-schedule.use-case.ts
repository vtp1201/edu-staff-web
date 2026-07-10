import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/**
 * Teacher self-scope: fetches the signed-in teacher's personal teaching
 * schedule — the periods they teach across all their classes in one week grid.
 * The teacher is resolved inside the repository (mock-first, plan decision 6);
 * this use-case takes no required args and maps thrown failures to a Result.
 * Mirrors {@link import("./get-my-timetable.use-case").GetMyTimetableUseCase}.
 */
export class GetMyTeachingScheduleUseCase {
  constructor(private readonly repo: IWeeklyTimetableRepository) {}

  async execute(
    weekStart?: string,
  ): Promise<TimetableViewResult<WeeklyTimetable>> {
    try {
      return { ok: true, data: await this.repo.getByTeacher(weekStart) };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
