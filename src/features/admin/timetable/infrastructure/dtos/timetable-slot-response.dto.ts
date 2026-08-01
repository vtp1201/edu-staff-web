import type { DayEnum } from "../../domain/day-enum";

/**
 * Wire shapes for the real `core` timetable contract (camelCase, decision 0008;
 * `services/core/docs/openapi.yaml` `SlotRequest`/`SlotResponse`/
 * `TimetableResponse`/`SetTimetableRequest`).
 *
 * BE US-153 (US-E18.26) added `room` to BOTH directions — cross-repo ask #17 is
 * resolved and the builder's room input now persists. It also added a
 * server-resolved `subjectName` to the response; the builder does NOT consume
 * it (its domain `TimetableSlot` holds ids only and the screen resolves subject
 * names from its own catalogue picker) — declared here for contract fidelity.
 *
 * Still NOT on the wire: `slotKey` (synthesised client-side from
 * `classId|day|period`) and `teacherName` (cross-repo ask #6/#7). `day` is the
 * Mon–Fri enum, not a number. The response's per-slot `classId` (added by
 * US-153 for the by-member view) is irrelevant on this class-scoped path — the
 * mapper uses the top-level `TimetableResponse.classId`.
 */
export interface SlotResponseDto {
  day: DayEnum;
  period: number;
  subjectId: string;
  /** Server-resolved display name — not consumed by the builder (see above). */
  subjectName?: string;
  teacherMemberId: string;
  /** Optional lesson location (US-153); omitted when unset. */
  room?: string;
}

export interface SlotRequestDto {
  day: DayEnum;
  period: number;
  subjectId: string;
  teacherMemberId: string;
  /** Optional lesson location, max 32 chars (US-153). Omitted when unknown. */
  room?: string;
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
