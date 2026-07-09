import type { TimetableSlot } from "./timetable-slot.entity";

/**
 * A published weekly timetable for one class.
 * `slots[dayIndex 0-5][periodNumber 1-10]` → a filled slot or `null` (free period).
 * dayIndex: 0 = Mon … 5 = Sat. periodNumber: 1..10 (lunch recess sits between 5 and 6).
 */
export interface WeeklyTimetable {
  classId: string;
  className: string;
  slots: Record<number, Record<number, TimetableSlot | null>>;
}
