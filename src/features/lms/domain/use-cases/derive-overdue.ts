import type { AssignmentStatus } from "../entities/assignment.entity";

/**
 * A pending assignment whose deadline has passed is *overdue* — a client-derived
 * visual state (FR-003), never a server status. Submitted/graded assignments are
 * NEVER overdue even if the deadline has passed. Single source of truth so the
 * card badge and the submit-click overdue-confirm gate can't drift (AC-1176.6).
 */
export function isOverdue(
  status: AssignmentStatus,
  dueDate: string,
  now: Date,
): boolean {
  return status === "pending" && new Date(dueDate).getTime() < now.getTime();
}
