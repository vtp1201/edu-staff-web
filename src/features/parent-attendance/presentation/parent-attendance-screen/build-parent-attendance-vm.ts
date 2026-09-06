import type { StatusTone } from "@/components/shared/status-badge/status-badge";
import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";
import type { ParentAttendanceFailure } from "../../domain/failures/parent-attendance.failure";

/**
 * Pure (framework-free) derivations for the parent attendance screen, kept out
 * of the `.tsx` so they are node-testable.
 */

/**
 * The status → tone table established for the teacher-facing attendance screen
 * (US-E13.2 / ADR 0058, `attendance-history-day-summary-row.tsx`). Reused
 * verbatim — one attendance vocabulary app-wide, no new mapping.
 */
export const ATTENDANCE_STATUS_TONE: Record<AttendanceStatus, StatusTone> = {
  present: "success",
  late: "info",
  excusedAbsent: "warning",
  absent: "error",
};

/** Stable render order for the summary chips (best → worst). */
export const ATTENDANCE_STATUS_ORDER: readonly AttendanceStatus[] = [
  "present",
  "late",
  "excusedAbsent",
  "absent",
];

/**
 * Failures a retry can actually fix. `forbidden` (the parent is not linked to
 * this child — a 403 no retry will change) and the two range failures are
 * terminal: the retry control is OMITTED, never merely disabled
 * (`ListError.showRetry`, INFRA-shared-list-states).
 */
export function isRetryableFailure(
  errorKey: ParentAttendanceFailure["type"],
): boolean {
  return errorKey === "network-error" || errorKey === "unknown";
}

/** Counts per status over the applied range (0 for statuses with no rows). */
export function countByStatus(
  records: readonly { status: AttendanceStatus }[],
): Record<AttendanceStatus, number> {
  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    excusedAbsent: 0,
    absent: 0,
  };
  for (const record of records) counts[record.status] += 1;
  return counts;
}

/**
 * Re-export of the promoted `parseIsoDate` (US-E24.6 moved it to
 * `@/shared/parse-iso-date` so `components/shared/attendance-summary` could use
 * it without importing a feature's presentation folder). Kept here so this
 * module's existing import sites and its unit test are untouched.
 */
export { parseIsoDate } from "@/shared/parse-iso-date";
