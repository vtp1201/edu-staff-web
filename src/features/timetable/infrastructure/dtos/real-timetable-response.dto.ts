/**
 * REAL `core` wire shapes (US-E18.11, camelCase, decision 0008;
 * `services/core/docs/openapi.yaml` `SlotResponse`/`TimetableResponse`).
 * Only consumed by `RealWeeklyTimetableRepository` (`getByClass`/`getByTeacher`
 * — the two operations that ARE wireable). Distinct from the legacy
 * `TimetableSlotDto`/`WeeklyTimetableResponseDto` in
 * `weekly-timetable-response.dto.ts`, which stay mock-only.
 *
 * The wire carries only ids — no `subjectName`/`teacherName`/`room`/`className`
 * (same gap as cross-repo ask #6/#7 — no display-name source). `day` is the
 * Mon–Fri string enum, not a number.
 */
export interface RealSlotResponseDto {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
  subjectId: string;
  teacherMemberId: string;
}

export interface RealTimetableResponseDto {
  classId: string;
  termId: string;
  slots: RealSlotResponseDto[];
}

/** `GET /classes` item — only the fields this feature needs from it. */
export interface ClassSummaryDto {
  classId: string;
  name: string;
}
