import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { TeacherClassFailure } from "../../domain/failures/teacher-class.failure";

/** Map a normalised ApiError (or raw error) to the class-view failure union.
 *  Branch on error.code (UPPER_SNAKE) / status, never on the message. */
export function toTeacherClassFailure(err: unknown): TeacherClassFailure {
  const status = statusOf(err);
  const code = errorCodeOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (status === 401 || code === "UNAUTHORIZED") {
    return { type: "unauthorized" };
  }
  if (status === 404 || code === "CLASS_NOT_FOUND" || code === "NOT_FOUND") {
    return { type: "not-found" };
  }
  return { type: "unknown" };
}
