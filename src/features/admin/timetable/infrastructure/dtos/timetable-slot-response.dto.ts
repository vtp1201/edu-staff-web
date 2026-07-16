import type { DayEnum } from "../../domain/day-enum";

/**
 * Wire shapes for the real `core` timetable contract (camelCase, decision 0008;
 * `services/core/docs/openapi.yaml` `SlotRequest`/`SlotResponse`/
 * `TimetableResponse`/`SetTimetableRequest`).
 *
 * Note what the wire does NOT carry: no `slotKey`, no `room`, no `subjectName`,
 * no `teacherName` — only ids. `day` is the Mon–Fri enum (not a number). The
 * mapper joins the day-index / synthesises `slotKey` client-side and documents
 * `room` as non-persistent (no wire field; cross-repo ask #17).
 */
export interface SlotResponseDto {
  day: DayEnum;
  period: number;
  subjectId: string;
  teacherMemberId: string;
}

export interface SlotRequestDto {
  day: DayEnum;
  period: number;
  subjectId: string;
  teacherMemberId: string;
}

export interface TimetableResponseDto {
  classId: string;
  termId: string;
  slots: SlotResponseDto[];
}

export interface SetTimetableRequestDto {
  termId: string;
  slots: SlotRequestDto[];
}
