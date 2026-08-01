/**
 * REAL `core` wire shapes (US-E18.11, camelCase, decision 0008;
 * `services/core/docs/openapi.yaml` `SlotResponse`/`TimetableResponse`).
 * Only consumed by `RealWeeklyTimetableRepository` (`getByClass`/`getByTeacher`
 * — the two operations that ARE wireable). Distinct from the legacy
 * `TimetableSlotDto`/`WeeklyTimetableResponseDto` in
 * `weekly-timetable-response.dto.ts`, which stay mock-only.
 *
 * BE US-153 (US-E18.26) made `subjectName` and `room` available on EVERY slot
 * response, so those are declared here for contract completeness even though
 * this class-scoped path currently has no caller in this feature (`getByClass`
 * is kept but unused — the parent view moved to the by-member endpoint).
 * `teacherName` is still absent everywhere (cross-repo ask #6/#7 — no
 * display-name source), so it stays an id fallback. `day` is the Mon–Fri
 * string enum, not a number.
 *
 * The wire's `SlotResponse` also carries a per-slot `classId`; it is NOT
 * declared here because the class-scoped path already knows the class from the
 * top-level `classId` (the by-member shape, where slots span classes, declares
 * it — see `member-timetable-response.dto.ts`).
 */
export interface RealSlotResponseDto {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
  subjectId: string;
  /** Server-resolved display name (US-153); omitted when unresolvable. */
  subjectName?: string;
  teacherMemberId: string;
  /** Optional lesson location (US-153); omitted when unset. */
  room?: string;
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
