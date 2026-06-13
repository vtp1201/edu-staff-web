import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { RosterFailure } from "../../domain/failures/roster.failure";

/** Map a normalized ApiError (or raw error) to the roster failure union by code/status. */
export function toRosterFailure(err: unknown): RosterFailure {
  const status = statusOf(err);
  const code = errorCodeOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (status === 401 || status === 403) {
    return { type: "unauthorized" };
  }
  if (
    status === 404 ||
    code === "CLASS_NOT_FOUND" ||
    code === "STUDENT_NOT_FOUND"
  ) {
    return { type: "not-found" };
  }
  return { type: "unknown" };
}
