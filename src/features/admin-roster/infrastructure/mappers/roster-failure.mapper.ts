import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { RosterFailure } from "../../domain/failures/roster.failure";

/**
 * Map a normalised ApiError (or raw error) to the roster failure union by code/status.
 * Branch on error.code (UPPER_SNAKE), never on message (TR-034, US-E06.7).
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
    code === "CLASS_ACCESS_FORBIDDEN" ||
    status === 403
  ) {
    return { type: "forbidden" };
  }
  if (
    status === 404 ||
    code === "CLASS_NOT_FOUND" ||
    code === "STUDENT_NOT_FOUND" ||
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
