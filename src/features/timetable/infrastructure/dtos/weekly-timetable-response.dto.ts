/**
 * BE `core` response shape for a published class timetable — this shape is
 * used ONLY by the mock repository/fixtures now (`getByTeacher`'s stub,
 * `getMyTimetable`, `getChildren` — all force-mock permanently, US-E18.11
 * cross-repo ask #15). The REAL wire shape (no names, no room, day-enum, flat
 * slot array) lives in `real-timetable-response.dto.ts` and is consumed only
 * by the real repository's `getByClass`/`getByTeacher`.
 * `subjectColorToken` is NOT on the wire — the mapper derives it from `subjectId`.
 * Day/period keys arrive as numeric-string object keys.
 */
export interface TimetableSlotDto {
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  room?: string;
  className?: string;
}

export interface WeeklyTimetableResponseDto {
  classId: string;
  className: string;
  slots: Record<string, Record<string, TimetableSlotDto | null>>;
}

export interface TimetableChildDto {
  childId: string;
  name: string;
  classId: string;
  className: string;
  avatar: string;
  color: string;
}
