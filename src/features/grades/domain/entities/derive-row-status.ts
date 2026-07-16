import type { GradeCell } from "./grade-sheet.entity";

/**
 * Row-level display status derived from a row's per-cell statuses
 * (US-E18.12, ADR 0054 §1.3). This is a PURE function, never a stored/server
 * field — the wire has no row-level status concept anymore (status lives per
 * cell). Do not invent a second server-side status.
 */
export type RowGradeStatus =
  | "empty" // no cell has a value yet
  | "draft" // at least one entered cell is still DRAFT (in progress)
  | "pending-approval" // no DRAFT cells remain, at least one PENDING_APPROVAL/SUBMITTED
  | "published" // no DRAFT/PENDING_APPROVAL cells remain, mix of PUBLISHED/LOCKED (not all LOCKED)
  | "locked"; // every entered cell is LOCKED

/**
 * Precedence (worst-progress-wins, matches how a teacher scans a roster —
 * "what still needs my attention" outranks "what's already done"): DRAFT
 * (needs action) > PENDING_APPROVAL (blocked on someone else) >
 * PUBLISHED/LOCKED (done). "locked" only fires when EVERY entered cell is
 * LOCKED. Empty columns (`value === null`) never gate the status.
 */
export function deriveRowStatus(
  scores: Record<string, GradeCell>,
): RowGradeStatus {
  const cells = Object.values(scores);
  const entered = cells.filter((c) => c.value !== null);
  if (entered.length === 0) return "empty";
  if (entered.some((c) => c.status === "DRAFT")) return "draft";
  if (
    entered.some(
      (c) => c.status === "PENDING_APPROVAL" || c.status === "SUBMITTED",
    )
  )
    return "pending-approval";
  if (entered.every((c) => c.status === "LOCKED")) return "locked";
  return "published"; // mix of PUBLISHED/LOCKED, or all PUBLISHED
}
