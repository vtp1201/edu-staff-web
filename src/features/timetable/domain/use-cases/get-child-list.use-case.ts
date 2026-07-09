import type { TimetableChild } from "../entities/timetable-child.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/** Parent scope: returns the parent's children roster (drives the picker). */
export class GetChildListUseCase {
  constructor(private readonly repo: IWeeklyTimetableRepository) {}

  async execute(): Promise<TimetableViewResult<TimetableChild[]>> {
    try {
      return { ok: true, data: await this.repo.getChildren() };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
