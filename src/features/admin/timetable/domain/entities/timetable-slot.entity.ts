/**
 * A single assigned cell in a class timetable: one (class, day, period) holds
 * one subject taught by one teacher in one room. `slotKey` is the canonical
 * identity `${classId}|${day}|${period}` used across detection and lookups.
 *
 * `day` is 0-indexed Mon..Sat (0..5); `period` is 1-indexed (1..10).
 */
export interface TimetableSlot {
  slotKey: string;
  classId: string;
  day: number;
  period: number;
  subjectId: string;
  teacherId: string;
  room: string;
}
