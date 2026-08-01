/**
 * Legacy/mock-only shape for a published class timetable — used ONLY by the
 * mock repository + fixtures. The REAL wire shapes live in
 * `real-timetable-response.dto.ts` (class-scoped) and
 * `member-timetable-response.dto.ts` (by-member, US-E18.26); every real-mode
 * operation reads one of those.
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
