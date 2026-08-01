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
 *
 * The by-member response carries NO top-level class identity (only a per-slot
 * `classId`), so the real repository returns `className: ""`. The roster item
 * already holds the enriched `classId`/`className` from `linked-students`
 * (BE US-148), so it is composed on here — symmetric with how the student
 * self-view composes its enrollment call inside the repository. Without this
 * the parent screen's class caption/badge would be blank in real mode even
 * though the name was fetched (tech-lead review, US-E18.26). Falls back to the
 * repository's own identity when the roster has none, which keeps the
 * mock path byte-identical.
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
      const week = await this.repo.getByMember(child.childId, weekStart);
      return {
        ok: true,
        // `classId` is left as the repository returned it (the by-member key);
        // nothing in this feature renders it, and the roster's `classId` is
        // optional. Only the DISPLAY name is composed on.
        data: { ...week, className: child.className ?? week.className },
      };
    } catch (err) {
      return { ok: false, error: toTimetableFailure(err) };
    }
  }
}
