import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import type { AbsenceHistoryRow } from "./entities/absence-history-row.entity";

/**
 * Build the absence-history list: every non-attended DAY, annotated with the
 * reason of an APPROVED leave request that covers it, preceded by a row for
 * each still-SUBMITTED request (US-E24.6). Pure — no clock, no i18n, no fetch.
 *
 * `LeaveRequestEntity` is a type-only cross-feature import (same precedent as
 * `parent-attendance` importing `AttendanceStatus`): the leave request is
 * genuinely a `discipline` concept and re-declaring it here would fork it.
 *
 * WHY ONLY `approved` SUPPLIES A REASON: a pending request is a claim, not a
 * fact — showing its text next to an already-recorded unexcused absence would
 * read as "this absence is excused" before the GVCN decided. A rejected request
 * is an explicitly refused claim. Both are excluded on purpose.
 */
export function joinAbsenceReasons(
  records: readonly ChildAttendanceRecord[],
  leaveRequests: readonly LeaveRequestEntity[],
): AbsenceHistoryRow[] {
  const approved = leaveRequests
    .filter((request) => request.status === "approved")
    .map((request) => ({
      start: toIsoDay(request.startDate),
      end: toIsoDay(request.endDate),
      reason: request.reason,
    }))
    .filter((r) => r.start !== null && r.end !== null);

  const absences: AbsenceHistoryRow[] = records
    .filter(
      (record) =>
        record.status === "absent" || record.status === "excusedAbsent",
    )
    .map((record) => ({
      key: `day-${record.date}`,
      date: record.date,
      endDate: null,
      kind:
        record.status === "absent" ? ("absent" as const) : ("excused" as const),
      reason:
        approved.find(
          // ISO `YYYY-MM-DD` compares lexicographically as a date; both ends
          // are INCLUSIVE (core's own range semantics).
          (r) =>
            r.start !== null &&
            r.end !== null &&
            record.date >= r.start &&
            record.date <= r.end,
        )?.reason ?? null,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const pending: AbsenceHistoryRow[] = leaveRequests
    .filter((request) => request.status === "pending")
    .map((request): AbsenceHistoryRow | null => {
      const start = toIsoDay(request.startDate);
      const end = toIsoDay(request.endDate);
      return start === null
        ? null
        : {
            key: `pending-${request.id}`,
            date: start,
            // A range that failed to parse degrades to a single day rather
            // than rendering "10/05 – Invalid Date".
            endDate: end ?? start,
            kind: "pending",
            reason: request.reason,
          };
    })
    .filter((row): row is AbsenceHistoryRow => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  return [...pending, ...absences];
}

/**
 * Normalise a leave request's date to ISO `YYYY-MM-DD`.
 *
 * `toLeaveRequestEntity` PRE-FORMATS `startDate`/`endDate` as `DD/MM/YYYY` for
 * the discipline dashboards, while attendance records are ISO. Rather than
 * change that shipped entity contract (four screens render it), the join
 * accepts both shapes and normalises here. Anything else yields `null`, which
 * simply means "this request cannot be matched to a day" — never a wrong match.
 */
function toIsoDay(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return value;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : null;
}
