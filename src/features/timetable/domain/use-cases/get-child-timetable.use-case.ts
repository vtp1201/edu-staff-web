import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/**
 * Parent scope: resolves the selected child's class via the roster, then
 * fetches that class's timetable. `no-child` when the childId is unknown.
 */
export class GetChildTimetableUseCase {
  constructor(private readonly repo: IWeeklyTimetableRepository) {}

  async execute(
    childId: string,
    weekStart?: string,
  ): Promise<TimetableViewResult<WeeklyTimetable>> {
    try {
      const children = await this.repo.getChildren();
      const child = children.find((c) => c.childId === childId);
      if (!child) return { ok: false, error: { type: "no-child" } };
      return {
        ok: true,
        data: await this.repo.getByClass(child.classId, weekStart),
      };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
