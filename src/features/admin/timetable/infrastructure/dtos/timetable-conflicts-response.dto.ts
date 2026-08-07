import type { DayEnum } from "../../domain/day-enum";

/**
 * Wire shapes for `GET /api/v1/timetable/conflicts?termId=` (BE US-188, ADR
 * 0128) — camelCase (decision 0008). Ground-truthed against BOTH
 * `services/core/docs/openapi.yaml` (`TimetableConflictEntry` /
 * `TimetableConflictsResponse`) and the Go structs that actually serialise it
 * (`services/core/internal/timetable/adapter/http/dto/conflicts.go`), because
 * the generated spec has drifted from the server before.
 *
 * `teacherMemberId` and `room` carry Go's `omitempty`, so they are ABSENT (not
 * null, not "") on the entry kind that does not own them — hence optional here
 * and required-per-kind only after the mapper narrows them onto the domain's
 * discriminated `ConflictInfo`.
 *
 * NOT on the wire (deliberately, US-188 Q4): any name enrichment — no
 * `className`, no `subjectName`, no `teacherName`. Presentation resolves display
 * names from its own catalogue, same as every other timetable read.
 * `scannedClassCount` is scan telemetry the BE keeps internal — not in the HTTP
 * contract, so it is not declared here.
 */
export type ConflictTypeDto = "TEACHER_DOUBLE_BOOKED" | "ROOM_DOUBLE_BOOKED";

export interface ConflictClassRefDto {
  classId: string;
  /** Subject held by this class at the conflicting (day, period). */
  subjectId: string;
}

export interface ConflictEntryDto {
  type: ConflictTypeDto;
  /** Mon–Fri enum — the core week has no Saturday. */
  day: DayEnum;
  period: number;
  /** ≥2 distinct classes, sorted by classId server-side (US-188 D5). */
  classes: ConflictClassRefDto[];
  /** Present only on TEACHER_DOUBLE_BOOKED. */
  teacherMemberId?: string;
  /** Present only on ROOM_DOUBLE_BOOKED (max 32 chars). */
  room?: string;
}

export interface TimetableConflictsResponseDto {
  termId: string;
  conflicts: ConflictEntryDto[];
  /** Scan hit its budget and stopped early — a hint, NOT an error state. */
  truncated: boolean;
}
