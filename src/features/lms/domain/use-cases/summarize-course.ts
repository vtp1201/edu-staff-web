import type { CourseItem } from "../entities/course-item.entity";

/** What a course card says about a course, derived from its timeline. */
export interface CourseSummaryStats {
  /** Items BE marked `OPEN` — the count the card shows as "N mục đang mở". */
  openCount: number;
  /** The OPEN item whose deadline comes first from `now` on; null when none. */
  nextDue: CourseItem | null;
}

/**
 * Fold a course timeline into the card summary (US-E24.2).
 *
 * A pure helper, not a `*.use-case.ts` class: it depends on no repository, so
 * it needs none of the `Result`/`runCatching` ceremony (same shape as
 * `derive-overdue.ts`).
 *
 * `state` is BE-COMPUTED and is used verbatim — availability is never
 * re-derived from the clock here (EPIC §2). The only thing `now` decides is
 * which deadline is still AHEAD of the reader, which is a display question.
 * It is injected rather than read from `Date.now()` so the result is
 * deterministic and the caller (the RSC page) owns the single clock read.
 */
export function summarizeCourse(
  items: CourseItem[],
  now: Date,
): CourseSummaryStats {
  const open = items.filter((item) => item.state === "OPEN");
  const nowMs = now.getTime();

  let nextDue: CourseItem | null = null;
  let nextDueMs = Number.POSITIVE_INFINITY;

  for (const item of open) {
    if (item.dueAt === null) continue;
    const dueMs = new Date(item.dueAt).getTime();
    // A deadline BE sent in a shape we cannot parse must not sort first.
    if (!Number.isFinite(dueMs) || dueMs < nowMs) continue;
    if (dueMs < nextDueMs) {
      nextDue = item;
      nextDueMs = dueMs;
    }
  }

  return { openCount: open.length, nextDue };
}
