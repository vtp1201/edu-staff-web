/**
 * REAL `core` by-member timetable wire shapes (US-E18.26 / BE US-153;
 * camelCase, decision 0008 — `services/core/docs/openapi.yaml`
 * `MemberTimetableResponse` + `SlotResponse`).
 *
 * Deliberately a SEPARATE file from `real-timetable-response.dto.ts`: the
 * class-scoped `TimetableResponse` is keyed by a single top-level `classId`,
 * whereas the by-member response is keyed by `memberId` and its slots may span
 * SEVERAL classes — hence the per-slot `classId`, which is what makes the two
 * shapes genuinely different for the mapper (one className for the whole grid
 * vs a per-slot classId→className lookup).
 *
 * `room` is echoed VERBATIM by the BE (trimmed + length-capped to 32, but NOT
 * sanitized). Rendering goes through plain JSX text interpolation, which
 * HTML-escapes by default — no `dangerouslySetInnerHTML` anywhere on this path
 * (verified US-E18.26). No client-side escaping work is needed.
 */
export interface MemberSlotResponseDto {
  /** Always present on the wire — the by-member view spans several classes. */
  classId: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
  subjectId: string;
  /** Server-resolved display name (US-153); omitted when unresolvable. */
  subjectName?: string;
  teacherMemberId: string;
  /** Optional lesson location (US-153); omitted when unset (not null, not ""). */
  room?: string;
}

export interface MemberTimetableResponseDto {
  /** For a PARENT reading their OWN memberId this is the RESOLVED CHILD. */
  memberId: string;
  termId: string;
  slots: MemberSlotResponseDto[];
}
