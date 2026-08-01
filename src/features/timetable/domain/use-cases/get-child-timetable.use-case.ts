import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../repositories/i-weekly-timetable.repository";
import {
  type TimetableViewResult,
  toTimetableFailure,
} from "./timetable-view.result";

/**
 * Parent scope: validates the selected childId against the roster, then fetches
 * that child's own week BY MEMBER ID (US-E18.26 — the BE resolves the child's
 * class server-side, so no classId discovery is needed and a child with no
 * current enrollment still resolves). `no-child` when the childId is unknown.
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
        data: await this.repo.getByMember(child.childId, weekStart),
      };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
