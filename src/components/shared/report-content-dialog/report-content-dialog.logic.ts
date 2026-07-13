import type { ReportReasonId } from "./report-content-dialog.i-props";

/** Reason "other" (and only it) requires a non-empty note (UC-1921 AC-1921.3). */
export function reasonRequiresNote(reason: ReportReasonId | null): boolean {
  return reason === "other";
}

/**
 * Submit is enabled iff a reason is chosen AND — when the reason is "other" —
 * a non-empty (trimmed) note has been entered (AC-1921.2 / AC-1921.3).
 */
export function isReportSubmittable(
  reason: ReportReasonId | null,
  note: string,
): boolean {
  if (!reason) return false;
  if (reasonRequiresNote(reason)) return note.trim().length > 0;
  return true;
}
