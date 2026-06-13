import type { TimetableSlot } from "./timetable-slot.entity";

/**
 * A detected teacher conflict: the same teacher is assigned to ≥2 classes at the
 * same `(day, period)`. `classIds` lists every class involved in the clash.
 */
export interface ConflictInfo {
  teacherId: string;
  day: number;
  period: number;
  classIds: string[];
}

/**
 * The timetable payload for one class in one academic year. `slots` is keyed by
 * the slot's canonical `slotKey`. `conflicts` covers the whole school (a teacher
 * clash can involve other classes), not just this class.
 */
export interface TimetableData {
  classId: string;
  yearId: string;
  slots: Record<string, TimetableSlot>;
  conflicts: ConflictInfo[];
}
