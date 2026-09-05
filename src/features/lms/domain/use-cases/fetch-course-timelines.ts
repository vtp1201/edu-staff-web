import type { CourseSummary } from "../entities/course.entity";
import type { CourseItem } from "../entities/course-item.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";

/** One course plus the timeline read for it. */
export interface CourseTimeline {
  course: CourseSummary;
  /** Empty ⇔ either the course genuinely has no items OR `itemsFailed` — the
   *  flag is what tells the two apart; callers must never read `[]` as "none". */
  items: CourseItem[];
  itemsFailed: boolean;
}

/**
 * The class's course list + EVERY course's timeline, in one fan-out.
 *
 * `lms` publishes no rollup endpoint (FE→BE ask #4), so both student course
 * views compose their data from `listCourses` once + `listItems` PER course.
 * Extracted here (US-E24.4) rather than duplicated: the card grid
 * (`ListCoursesWithSummaryUseCase`, US-E24.2) folds these timelines into a
 * summary, the cross-subject filter (`ListCoursesWithItemsUseCase`) keeps them
 * raw — same reads, same degradation rules, one implementation. When BE ships
 * the rollup, this single function collapses into one repository call.
 *
 * Two distinct error levels, on purpose:
 *  - `listCourses` failing THROWS (the caller's `runCatching` turns it into the
 *    page-level failure — there is no page without the list);
 *  - one `listItems` failing marks only that row `itemsFailed`. A single
 *    degraded timeline must never blank out its healthy siblings.
 */
export async function fetchCourseTimelines(
  repo: ILmsRepository,
  classId: string,
  subjectId?: string,
): Promise<CourseTimeline[]> {
  const courses = await repo.listCourses(classId, subjectId);

  const settled = await Promise.allSettled(
    courses.map((course) => repo.listItems(course.id)),
  );

  return courses.map((course, index) => {
    const outcome = settled[index];
    if (outcome === undefined || outcome.status === "rejected") {
      return { course, items: [], itemsFailed: true };
    }
    return { course, items: outcome.value, itemsFailed: false };
  });
}
