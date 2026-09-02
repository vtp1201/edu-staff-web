/**
 * `dueAt` has passed. CLIENT-derived on purpose: BE states plainly that a
 * submission's lateness "is rendered by the client from `dueAt` +
 * `submittedAt`" — there is no `late` flag on the wire. Null `dueAt` means the
 * assignment/item has no deadline, so it is never overdue.
 *
 * This is NOT a substitute for `state`/`CourseItemState`, which only BE
 * computes; it is purely the deadline framing the UI shows.
 */
export function isOverdue(dueAt: string | null, now: Date): boolean {
  if (dueAt === null) return false;
  const due = new Date(dueAt).getTime();
  return Number.isFinite(due) && due < now.getTime();
}
