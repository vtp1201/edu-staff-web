import type { TimetableSlot } from "./timetable-slot.entity";

/**
 * A published weekly timetable for one class.
 * `slots[dayIndex 0-5][periodNumber 1-10]` → a filled slot or `null` (free period).
 * dayIndex: 0 = Mon … 5 = Sat. periodNumber: 1..10 (lunch recess sits between 5 and 6).
 *
 * Reused as-is for the teacher-scope view (US-E15.2): the same shape represents a
 * teacher's week, where top-level `classId` / `className` hold the teacher's own
 * id / name and each slot's `className` marks the class being taught that period.
 * This is documented reuse (not a rename) so `TimetableGrid` consumes one shape.
 */
export interface WeeklyTimetable {
  classId: string;
  className: string;
  slots: Record<number, Record<number, TimetableSlot | null>>;
}
