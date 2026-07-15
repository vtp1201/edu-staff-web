import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { RosterFailure } from "../../domain/failures/roster.failure";

/**
 * Map a normalised ApiError (or raw error) to the roster failure union by code/status.
 * Branch on error.code (UPPER_SNAKE), never on message (TR-034, US-E06.7).
 *
 * Codes cross-checked against `edu-api/services/core/docs/ERROR_CODES.md`
 * ("Class — Student roster / Enrollment (US-043)" + "Class + TeachingAssignment
 * (US-041)") in US-E18.5: `CLASS_ACCESS_FORBIDDEN`/`STUDENT_NOT_FOUND` were
 * guessed codes (US-E06.7 mock-first) that do not exist on the real API — removed;
 * the real 403 read code is `CLASS_FORBIDDEN` (US-041, applies to `getClasses`).
 */
export function toRosterFailure(err: unknown): RosterFailure {
  const status = statusOf(err);
  const code = errorCodeOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (status === 401 || code === "UNAUTHORIZED") {
    return { type: "unauthorized" };
  }
  if (
    code === "ROSTER_ACCESS_FORBIDDEN" ||
    code === "CLASS_FORBIDDEN" ||
    status === 403
  ) {
    return { type: "forbidden" };
  }
  if (
    status === 404 ||
    code === "CLASS_NOT_FOUND" ||
    code === "ROSTER_STUDENT_NOT_ENROLLED"
  ) {
    return { type: "not-found" };
  }
  if (code === "ROSTER_STUDENT_ALREADY_ENROLLED") {
    return { type: "already-enrolled" };
  }
  if (code === "ROSTER_MEMBER_NOT_STUDENT_ROLE") {
    return { type: "member-not-student" };
  }
  if (code === "CLASS_ARCHIVED") {
    return { type: "class-archived" };
  }
  return { type: "unknown" };
}
