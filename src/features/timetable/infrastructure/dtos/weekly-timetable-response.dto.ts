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
  /** Mock-only member id for the seeded demo teacher (US-E24.9): mock mode has
   *  no IAM directory, so the class-hub's "tiết của bạn" affordances would
   *  never light up without a stable id to match the mock auth context. */
  teacherMemberId?: string;
  /** Mock-only bell schedule ("HH:mm") — exercises the "Đang diễn ra" /
   *  time-shown branch that the REAL wire cannot drive yet (US-244 is draft). */
  startTime?: string;
  endTime?: string;
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
