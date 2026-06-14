import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { TeacherDashboardFailure } from "../../domain/failures/teacher-dashboard.failure";

/** Map a normalised ApiError (or raw error) to the dashboard failure union.
 *  Branch on error.code (UPPER_SNAKE) / status, never on the message. */
export function toTeacherDashboardFailure(
  err: unknown,
): TeacherDashboardFailure {
  const status = statusOf(err);
  const code = errorCodeOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (status === 401 || code === "UNAUTHORIZED") {
    return { type: "unauthorized" };
  }
  return { type: "unknown" };
}
