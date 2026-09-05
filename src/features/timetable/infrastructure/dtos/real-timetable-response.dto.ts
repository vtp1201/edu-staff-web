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
 * `teacherName` SHIPPED with BE US-234 (contract-update §2.3), closing
 * asks #6/#7: it is read when present and the raw id remains the fallback. `day` is the Mon–Fri
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
  /** Server-resolved teacher display name (BE US-234, contract-update §2.3);
   *  omitted when the member could not be resolved — the id stays the
   *  fallback. */
  teacherName?: string;
  /** Optional lesson location (US-153); omitted when unset. */
  room?: string;
  /** Tenant-local bell-schedule start, `"HH:mm"` (BE US-244) — resolved
   *  server-side from the tenant's bell schedule so no client lookup table is
   *  needed. OMITTED when the tenant published no bell entry for this period,
   *  the same convention as `subjectName`/`teacherName`. */
  startTime?: string;
  /** Tenant-local bell-schedule end, `"HH:mm"` — same omission rule. */
  endTime?: string;
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
