import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { AttendanceFailure } from "../../domain/failures/attendance.failure";

const KNOWN_TYPES: ReadonlySet<AttendanceFailure["type"]> = new Set([
  "forbidden",
  "not-found",
  "correction-window-expired",
  "student-not-enrolled",
  "invalid-request",
  "network-error",
  "unknown",
]);

/** Some failures are thrown directly by this feature's own use-cases (e.g.
 *  the history clamp) as an already-typed `AttendanceFailure` — pass those
 *  through unchanged instead of re-deriving them from a wire error. */
function isAttendanceFailure(err: unknown): err is AttendanceFailure {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string" &&
    KNOWN_TYPES.has((err as { type: AttendanceFailure["type"] }).type)
  );
}

const INVALID_REQUEST_CODES = new Set([
  "ATTENDANCE_INVALID_TENANT_ID",
  "ATTENDANCE_INVALID_CLASS_ID",
  "ATTENDANCE_INVALID_MEMBER_ID",
  "ATTENDANCE_INVALID_DATE",
  "ATTENDANCE_INVALID_STATUS",
  "ATTENDANCE_BATCH_TOO_LARGE",
  "ATTENDANCE_INVALID_DATE_RANGE",
  "ATTENDANCE_DATE_RANGE_TOO_LARGE",
]);

/** Ground-truthed against `core/internal/attendance/core/domain/error/errors.go`
 *  (12 constructors, ADR `0058`). Branch on `error.code` (UPPER_SNAKE) /
 *  status, never on `message` — mirrors `toTeacherClassFailure`'s shape. */
export function toAttendanceFailure(err: unknown): AttendanceFailure {
  if (isAttendanceFailure(err)) return err;

  const status = statusOf(err);
  const code = errorCodeOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (code === "ATTENDANCE_FORBIDDEN") return { type: "forbidden" };
  if (code === "ATTENDANCE_NOT_FOUND") return { type: "not-found" };
  if (code === "ATTENDANCE_CORRECTION_WINDOW_EXPIRED") {
    return { type: "correction-window-expired" };
  }
  if (code === "ATTENDANCE_STUDENT_NOT_ENROLLED") {
    return { type: "student-not-enrolled" };
  }
  if (code !== undefined && INVALID_REQUEST_CODES.has(code)) {
    return { type: "invalid-request" };
  }
  return { type: "unknown" };
}
