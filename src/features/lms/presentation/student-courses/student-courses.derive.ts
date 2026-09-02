import type { CourseWithSummary } from "@/features/lms/domain/use-cases/list-courses-with-summary.use-case";
import { toneForId } from "../tone";
import type { CourseCardVm } from "./student-courses-screen.i-vm";

/** How close a deadline has to be before the card shows it in a warning tone
 *  (design-spec `courseCards.dueNextBlock.urgent`). */
const DUE_SOON_MS = 48 * 60 * 60 * 1000;

/**
 * Domain rows → card ViewModels (US-E24.2).
 *
 * The 48h urgency cut is resolved HERE, against the server's single `now`, so
 * every card in one response is judged by the same clock and a tab left open
 * never silently re-colours itself. `href` is passed in as a builder because
 * only the route knows the locale/tenant segments.
 */
export function toCourseCardVms(
  rows: CourseWithSummary[],
  now: Date,
  hrefFor: (courseId: string) => string,
): CourseCardVm[] {
  const soonCutoff = now.getTime() + DUE_SOON_MS;

  return rows.map(({ course, summary, itemsFailed }) => {
    const nextDue = summary?.nextDue ?? null;

    return {
      id: course.id,
      title: course.title,
      status: course.status,
      isDefault: course.isDefault,
      tone: toneForId(course.id),
      href: hrefFor(course.id),
      openCount: summary?.openCount ?? null,
      nextDue:
        nextDue?.dueAt != null
          ? {
              id: nextDue.id,
              title: nextDue.title,
              itemType: nextDue.itemType,
              dueAt: nextDue.dueAt,
              dueSoon: new Date(nextDue.dueAt).getTime() <= soonCutoff,
            }
          : null,
      itemsFailed,
    };
  });
}
