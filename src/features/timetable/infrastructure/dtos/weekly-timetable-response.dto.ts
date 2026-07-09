/**
 * BE `core` response shape for a published class timetable (camelCase wire
 * contract — contract-first per decision 0014; service not shipped yet).
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
