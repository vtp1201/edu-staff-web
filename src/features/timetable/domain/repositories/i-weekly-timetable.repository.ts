import type { TimetableChild } from "../entities/timetable-child.entity";
import type { WeeklyTimetable } from "../entities/weekly-timetable.entity";

/**
 * Read data source for the timetable view (DIP). Implementations throw a typed
 * {@link import("../failures/timetable-view.failure").TimetableViewFailure} on
 * error (e.g. `{ type: "not-found" }` for a class with no published timetable).
 *
 * Extensibility seam (plan decision 2): `getByClass` is the primitive fetch;
 * US-E15.2 (teacher scope) adds a sibling `getByTeacher` returning the same
 * `WeeklyTimetable` shape — additive, no breaking change. `getMyTimetable` /
 * `getChildren` are the mock-first self-scope resolvers (plan decision 6) that a
 * real BE `core`/`iam` profile endpoint would back later.
 */
export interface IWeeklyTimetableRepository {
  /** Class-scoped fetch (used by the parent view + the real HTTP impl). */
  getByClass(classId: string, weekStart?: string): Promise<WeeklyTimetable>;
  /** Student self-scope — resolves the signed-in student's class server-side. */
  getMyTimetable(weekStart?: string): Promise<WeeklyTimetable>;
  /** Parent's children roster (drives the child-picker). */
  getChildren(): Promise<TimetableChild[]>;
}
